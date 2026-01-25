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
        const token = import.meta.env.VITE_PCLOUD_ACCESS_TOKEN || "DUMMY_TOKEN";
        const client = pcloud.createClient(token);

        // Helper to call pCloud API with region fallback using the SDK
        async function pcloudApi(method: string, params: any) {
          const servers = ["api.pcloud.com", "eapi.pcloud.com"];
          let lastRes: any;

          for (const apiServer of servers) {
            try {
              if (method === "getpubthumbslinks") {
                // pcloud-sdk-js validates method names and throws if unknown.
                // getpubthumbslinks is not in the allowlist, so we use fetch directly.
                const url = new URL(`https://${apiServer}/${method}`);
                Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

                const response = await fetch(url.toString());
                const data = await response.json();

                if (data.result !== 0) {
                  throw data;
                }
                return data;
              } else {
                // Using SDK's client.api which handles auth and URL building
                const res = await client.api(method, { params, apiServer });
                return res;
              }
            } catch (err: any) {
              lastRes = err;
              // 7001 is "Invalid link 'code'", happens if region is wrong for publinks
              if (err.result === 7001 || err.result === 500) {
                console.warn(`pCloud API error ${err.result} on ${apiServer}, trying next...`);
                continue;
              }
              throw err;
            }
          }
          throw lastRes;
        }

        let fileList: any[] = [];

        if (publink_code) {
          console.log("Fetching publink:", publink_code);
          const res = await pcloudApi("showpublink", { code: publink_code });
          console.log("Publink Res:", res);
          if (res && res.metadata && res.metadata.contents) {
            fileList = res.metadata.contents;
          } else {
            throw new Error(res.error || "No contents found in publink");
          }
        } else if (folder) {
          console.log("Fetching folder:", folder);
          // listfolder is usually fine with default client if token is set,
          // but for consistency we use our helper.
          const res = await pcloudApi("listfolder", { folderid: parseInt(folder) });
          console.log("Folder Res:", res);
          if (res && res.metadata && res.metadata.contents) {
            fileList = res.metadata.contents;
          } else {
            throw new Error(res.error || "No contents found in folder");
          }
        }

        // Filter for images
        const images = fileList.filter((f: any) => !f.isfolder && f.contenttype && f.contenttype.startsWith("image"));

        // Batch fetch thumbnails
        let thumbMap: Record<number, string> = {};
        if (images.length > 0) {
          const fileids = images.map((f: any) => f.fileid).join(",");
          try {
            const thumbParams: any = {
              fileids,
              size: "1024x768",
              crop: 0,
              type: "jpg"
            };
            if (publink_code) {
              thumbParams.code = publink_code;
            }

            // Use getpubthumbslinks for public links (no auth needed if code is present)
            // or getthumbslinks if we were logged in (but here we focus on public link mainly)
            // The user requested getpubthumbslinks for public links.
            const method = publink_code ? "getpubthumbslinks" : "getthumbslinks";

            const linkRes = await pcloudApi(method, thumbParams);

            if (linkRes && linkRes.thumbs) {
              linkRes.thumbs.forEach((t: any) => {
                if (t.result === 0 && t.path && t.hosts && t.hosts.length > 0) {
                  thumbMap[t.fileid] = `https://${t.hosts[0]}${t.path}`;
                }
              });
            }
          } catch (e) {
            console.error("Batch thumb fetch failed", e);
          }
        }

        // Map photos
        const photoData = images.map((f: any) => {
          return {
            src: thumbMap[f.fileid] || "", // Fallback empty if failed
            width: f.width || 800,
            height: f.height || 600,
            key: f.fileid,
            alt: f.name
          };
        });

        // If we strictly rely on batch, some might be missing if batch failed.
        // We will filter out empty ones.
        setPhotos(photoData.filter((p: any) => p.src !== ""));

      } catch (err: any) {
        console.error(err);
        setError(err.error || err.message || "Unknown error");
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
