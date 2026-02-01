import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { useGesture } from 'react-use-gesture';
import { pcloudApi } from '../../lib/pcloud';
import { usePhotoContext, Photo } from '../../contexts/PhotoContext';



export const Route = createFileRoute('/app/photo/$photoId')({
  validateSearch: (search: Record<string, unknown>) => {
    if (typeof search.publink_code !== 'string') {
      console.error('publink_code is missing in search params');
    }
    return {
      publink_code: search.publink_code as string | undefined,
    };
  },
  component: PhotoPage,
});

function PhotoPage() {
  const { photoId } = Route.useParams();
  const { publink_code } = Route.useSearch();
  const { photos } = usePhotoContext();
  const navigate = useNavigate();

  const [highResSrc, setHighResSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentIndex = photos.findIndex(p => p.key === photoId);
  const photo = photos[currentIndex];

  const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
  const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;

  const navigateToPhoto = useCallback((targetPhoto: Photo | null) => {
    if (targetPhoto) {
      navigate({
        to: '/app/photo/$photoId',
        params: { photoId: targetPhoto.key! },
        search: { publink_code },
      });
    }
  }, [navigate, publink_code]);

  // Keyboard and Swipe Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigateToPhoto(prevPhoto);
      if (e.key === 'ArrowRight') navigateToPhoto(nextPhoto);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPhoto, nextPhoto, navigateToPhoto]);

  const bind = useGesture({
    onDrag: ({ down, movement: [mx] }) => {
      if (!down && Math.abs(mx) > 50) {
        if (mx > 0) navigateToPhoto(prevPhoto);
        else navigateToPhoto(nextPhoto);
      }
    },
  });

  // Fetch high-resolution image
  useEffect(() => {
    let isCancelled = false;
    async function loadHighRes() {
      if (!photo || !publink_code) return;
      setLoading(true);
      setHighResSrc(photo.src); // Show thumbnail initially

      try {
        const res = await pcloudApi("getpubthumblink", {
          code: publink_code,
          fileid: Number(photo.key),
          size: "2048x2048", // Using a large size as requested
        });
        if (!isCancelled && res.hosts && res.path) {
          setHighResSrc(`https://${res.hosts[0]}${res.path}`);
        }
      } catch (err) {
        console.error("Failed to fetch high-res image", err);
        // Keep thumbnail src if high-res fails
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadHighRes();
    return () => { isCancelled = true; };
  }, [photo, publink_code]);

  if (!photo) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>Photo not found.</p>
        <Link to="/app" search={{ publink_code }} className="text-blue-500 underline ml-4">
          Back to album
        </Link>
      </div>
    );
  }

  return (
    <div {...bind()} className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center text-white z-50 touch-none" >
      <Link to="/app" search={{ publink_code }} className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors" aria-label="Back to album">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </Link>

      <div className="relative w-full h-full flex items-center justify-center">
        {loading && <div className="absolute text-white">Loading...</div>}
        {highResSrc && (
          <img
            src={highResSrc}
            alt={photo.alt}
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <p className="text-center text-sm truncate">{photo.alt}</p>
        </div>
      </div>

      {prevPhoto && (
        <button onClick={() => navigateToPhoto(prevPhoto)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors" aria-label="Previous photo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {nextPhoto && (
        <button onClick={() => navigateToPhoto(nextPhoto)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors" aria-label="Next photo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  );
}
