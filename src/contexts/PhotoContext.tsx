import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { pcloudApi } from '../lib/pcloud';

export type Photo = {
  src: string;
  width: number;
  height: number;
  key?: string;
  alt?: string;
  [key: string]: any;
};

type PhotoDataContextType = {
  photos: Photo[];
  publink_code?: string;
  albumName: string;
};

type PhotoCacheContextType = {
  highResSrcCache: Map<string, string>;
  setHighResSrcCache: (photoId: string, highResSrc: string) => void;
  getHighResSrcCache: (photoId: string) => string | undefined;
  getHighResPhoto: (photoId: string, publink_code: string) => Promise<string>;
};

export const PhotoDataContext = createContext<PhotoDataContextType | undefined>(undefined);
export const PhotoCacheContext = createContext<PhotoCacheContextType | undefined>(undefined);

/**
 * Hook for stable photo data (photos list, album name)
 */
export function usePhotoContext() {
  const context = useContext(PhotoDataContext);
  if (!context) {
    throw new Error('usePhotoContext must be used within a PhotoDataProvider');
  }
  return context;
}

/**
 * Hook for dynamic high-res image cache
 */
export function usePhotoCacheContext() {
  const context = useContext(PhotoCacheContext);
  if (!context) {
    throw new Error('usePhotoCacheContext must be used within a PhotoCacheProvider');
  }
  return context;
}

/**
 * Provider component for managing dynamic high-res image cache
 */
export function PhotoCacheProvider({ children }: { children: ReactNode }) {
  const [highResSrcCache, setHighResSrcCacheState] = useState<Map<string, string>>(new Map());

  const setHighResSrcCache = useCallback((photoId: string, highResSrc: string) => {
    setHighResSrcCacheState(prev => new Map(prev).set(photoId, highResSrc));
  }, []);

  const getHighResSrcCache = useCallback((photoId: string) => {
    return highResSrcCache.get(photoId);
  }, [highResSrcCache]);

  const getHighResPhoto = useCallback(async (photoId: string, publink_code: string) => {
    const cached = highResSrcCache.get(photoId);
    if (cached) return cached;

    const res = await pcloudApi("getpubthumblink", {
      code: publink_code,
      fileid: Number(photoId),
      size: "2048x2048",
    });

    if (res.hosts && res.path) {
      const highResUrl = `https://${res.hosts[0]}${res.path}`;
      setHighResSrcCache(photoId, highResUrl);
      return highResUrl;
    }

    throw new Error("Failed to get high resolution link");
  }, [highResSrcCache, setHighResSrcCache]);

  return (
    <PhotoCacheContext.Provider value={{ highResSrcCache, setHighResSrcCache, getHighResSrcCache, getHighResPhoto }}>
      {children}
    </PhotoCacheContext.Provider>
  );
}/**
 * Custom hook that manages high-res photo state and fetching
 */
export function useHighResPhoto(photo: Photo | null, publink_code?: string) {
  const { getHighResPhoto } = usePhotoCacheContext();
  const [src, setSrc] = useState<string | null>(photo?.src || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      if (!photo || !publink_code) return;

      setIsLoading(true);
      setSrc(photo.src); // Show thumbnail initially

      try {
        const url = await getHighResPhoto(photo.key!, publink_code);
        if (!isCancelled) {
          setSrc(url);
        }
      } catch (err) {
        console.error("Failed to fetch high-res image", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { isCancelled = true; };
  }, [photo, publink_code, getHighResPhoto]);

  return { src, isLoading };
}

