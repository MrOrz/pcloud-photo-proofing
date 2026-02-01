import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { pcloudApi } from '../lib/pcloud';
import { PhotoDataContext, PhotoCacheProvider, Photo } from '../contexts/PhotoContext';

type AppSearch = {
  publink_code?: string;
};

export const Route = createFileRoute('/app')({
  validateSearch: (search: Record<string, unknown>): AppSearch => {
    return {
      publink_code: (search.publink_code as string) || undefined,
    };
  },
  component: AppLayout,
});



function AppLayout() {
  const { publink_code } = Route.useSearch();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albumName, setAlbumName] = useState("Public Album");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!publink_code) {
        setLoading(false);
        return;
      };
      setLoading(true);
      setError(null);

      try {
        let fileList: any[] = [];
        const res = await pcloudApi("showpublink", { code: publink_code });
        if (res && res.metadata) {
          fileList = res.metadata.contents || [];
          if (res.metadata.name) {
            setAlbumName(res.metadata.name);
          }
        } else {
          throw new Error(res.error || "No contents found in publink");
        }

        const images = fileList.filter((f: any) => !f.isfolder && f.contenttype && f.contenttype.startsWith("image"));

        let thumbMap: Record<number, string> = {};
        if (images.length > 0) {
          const fileids = images.map((f: any) => f.fileid).join(",");
          const linkRes = await pcloudApi("getpubthumbslinks", {
            code: publink_code,
            fileids,
            size: "512x512",
            crop: 0,
            type: "jpg"
          });

          if (linkRes && linkRes.thumbs) {
            linkRes.thumbs.forEach((t: any) => {
              if (t.result === 0 && t.path && t.hosts && t.hosts.length > 0) {
                thumbMap[t.fileid] = `https://${t.hosts[0]}${t.path}`;
              }
            });
          }
        }

        const photoData = images.map((f: any) => ({
          src: thumbMap[f.fileid] || "",
          width: f.width || 800,
          height: f.height || 600,
          key: String(f.fileid),
          alt: f.name
        }));

        setPhotos(photoData.filter((p: any) => p.src !== ""));
      } catch (err: any) {
        setError(err.error || err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [publink_code]);

  if (loading) return <div className="p-10 text-center">Loading from pCloud...</div>;
  if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

  return (
    <PhotoDataContext.Provider value={{ photos, publink_code, albumName }}>
      <PhotoCacheProvider>
        <Outlet />
      </PhotoCacheProvider>
    </PhotoDataContext.Provider>
  );
}
