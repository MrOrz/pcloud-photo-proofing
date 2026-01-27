import { createContext, useContext } from 'react';

type Photo = {
  src: string;
  width: number;
  height: number;
  key?: string;
  alt?: string;
  [key: string]: any;
};

type PhotoContextType = {
  photos: Photo[];
  publink_code?: string;
  albumName: string;
};

export const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function usePhotoContext() {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotoContext must be used within a PhotoProvider');
  }
  return context;
}
