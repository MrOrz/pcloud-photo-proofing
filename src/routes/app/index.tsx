import { createFileRoute, Link } from '@tanstack/react-router';
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import { usePhotoContext } from '../../contexts/PhotoContext';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/')({
  component: AlbumPage,
});

function AlbumPage() {
  const { photos, publink_code, albumName } = usePhotoContext();

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-stone-800 to-stone-600">
          {albumName}
        </h1>
        <a href="/" className="text-sm text-stone-500 hover:text-stone-900 underline">Back to Home</a>
      </header>

      {photos.length === 0 ? (
        <div className="text-center text-stone-500 mt-20">
          <p>No photos found in this folder.</p>
          <p className="text-xs mt-2">Make sure the folder contains images.</p>
        </div>
      ) : (
        <RowsPhotoAlbum
          photos={photos}
          render={{
            wrapper: ({ style, ...props }, { photo }) => (
              <Link
                className={cn("block", props.className)}
                to="/app/photo/$photoId"
                params={{ photoId: photo.key! }}
                search={{ publink_code }}
                style={style}
              >
                {props.children}
              </Link>
            ),
          }}
        />
      )}
    </div>
  );
}
