import React from "react";
import { MovieProps } from "../apis/room/RoomApi";
import { FileUploadIcon } from "./Icons";

interface MovieSelectorProps {
  isRoomCreator: boolean;
  movies: MovieProps[];
  selectedMovie: MovieProps | null;
  loadingMovies: boolean;
  onSelectMovie: (movie: MovieProps) => void;
  onOpenUploadDialog: () => void;
  onClose: () => void;
}

const MovieSelector: React.FC<MovieSelectorProps> = ({
  isRoomCreator,
  movies,
  selectedMovie,
  loadingMovies,
  onSelectMovie,
  onOpenUploadDialog,
  onClose,
}) => {
  return (
    <>
      <div className="mb-5 text-center text-gray-600">
        {isRoomCreator
          ? "选择一部电影与房间内的所有人一起观看"
          : "目前可用的电影列表 (只有房主可以选择)"}
      </div>

      {loadingMovies ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-96">
          {movies.map(movie => (
            <div
              key={movie.id}
              className={`relative rounded-lg overflow-hidden shadow-md cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${!isRoomCreator && 'pointer-events-none opacity-80'}`}
              onClick={() => onSelectMovie(movie)}
            >
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={movie.coverUrl}
                  alt={movie.title}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x169?text=No+Image';
                  }}
                />
              </div>
              <div className="p-3 bg-white">
                <h3 className="font-semibold text-sm text-gray-800 truncate">{movie.title}</h3>
                {movie.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{movie.description}</p>
                )}
              </div>
              {selectedMovie?.id === movie.id && (
                <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  当前播放
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          暂无可用电影
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={onOpenUploadDialog}
          className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors flex items-center gap-2"
        >
          <FileUploadIcon />
          上传新电影
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          关闭
        </button>
      </div>
    </>
  );
};

export default MovieSelector;