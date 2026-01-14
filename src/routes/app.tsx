import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
// @ts-ignore
import * as pcloudSDK from "pcloud-sdk-js";

// @ts-ignore
const pcloud = pcloudSDK.default || pcloudSDK;

type AppSearch = {
  folder?: string;
  publink_code?: string;
}

export const Route = createFileRoute('/app')({
  validateSearch: (search: Record<string, unknown>): AppSearch => {
    return {
      folder: (search.folder as string) || undefined,
      publink_code: (search.publink_code as string) || undefined,
    };
  },
  component: AppPage,
});

function AppPage() {
  const { folder, publink_code } = Route.useSearch();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!folder && !publink_code) return;
      setLoading(true);
      setError(null);

      try {
        // Attempt to create client. token is optional for publink in general API,
        // but SDK might strictly require one in createClient.
        // We pass a dummy or checks ENV.
        const token = import.meta.env.VITE_PCLOUD_ACCESS_TOKEN || "DUMMY_TOKEN";
        const client = pcloud.createClient(token);

        let fileList: any[] = [];

        if (publink_code) {
          console.log("Fetching publink:", publink_code);
          // showpublink is not directly on client in current SDK version
          const res = await client.api("showpublink", { params: { code: publink_code } });
          console.log("Publink Res:", res);
          if (res && res.metadata && res.metadata.contents) {
            fileList = res.metadata.contents;
          } else {
            throw new Error(res.error || "No contents found in publink");
          }
        } else if (folder) {
          console.log("Fetching folder:", folder);
          const res = await client.listfolder(parseInt(folder));
          console.log("Folder Res:", res);
          if (res && res.metadata && res.metadata.contents) {
            fileList = res.metadata.contents;
          } else {
            throw new Error(res.error || "No contents found in folder");
          }
        }

        // Filter for images
        const images = fileList.filter((f: any) => !f.isfolder && f.contenttype && f.contenttype.startsWith("image"));

        // Get download links
        const photoData = await Promise.all(images.map(async (f: any) => {
          let src = "";
          try {
            if (publink_code) {
              const linkRes = await client.api("getpublinkdownload", { params: { code: publink_code, fileid: f.fileid } });
              if (linkRes && linkRes.path && linkRes.hosts && linkRes.hosts.length > 0) {
                src = `https://${linkRes.hosts[0]}${linkRes.path}`;
              }
            } else {
              const linkRes: any = await client.getfilelink(f.fileid);
              if (typeof linkRes === 'string') {
                src = linkRes;
              } else if (linkRes && linkRes.path && linkRes.hosts && linkRes.hosts.length > 0) {
                src = `https://${linkRes.hosts[0]}${linkRes.path}`;
              }
            }
          } catch (e) {
            console.error("Failed to get link for", f.name, e);
          }

          return {
            src: src,
            width: f.width || 800, // pCloud metadata usually has width/height for images
            height: f.height || 600,
            key: f.fileid,
            alt: f.name
          };
        }));

        setPhotos(photoData.filter(p => p.src !== ""));

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [folder, publink_code]);

  if (loading) return <div className="p-10 text-center">Loading from pCloud...</div>;
  if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-stone-800 to-stone-600">
          {publink_code ? 'Public Album' : 'My Album'}
        </h1>
        <a href="/" className="text-sm text-stone-500 hover:text-stone-900 underline">Back to Home</a>
      </header>

      {photos.length === 0 ? (
        <div className="text-center text-stone-500 mt-20">
          <p>No photos found in this folder.</p>
          <p className="text-xs mt-2">Make sure the folder contains images.</p>
        </div>
      ) : (
        <RowsPhotoAlbum photos={photos} />
      )}
    </div>
  );
}
