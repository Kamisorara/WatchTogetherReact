import React, { useState } from "react";
import { MovieProps } from "../apis/room/RoomApi";
import { FileUploadIcon, FilmIcon } from "./Icons";

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(movies.length > 8 ? 'list' : 'grid');

  return (
    <>
      <div className="mb-5 text-center text-gray-600">
        {isRoomCreator
          ? "选择一部电影与房间内的所有人一起观看"
          : "目前可用的电影列表 (只有房主可以选择)"}
      </div>

      {/* View mode toggle */}
      {movies.length > 0 && (
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'}`}
            >
              网格视图
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm ${viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'}`}
            >
              列表视图
            </button>
          </div>
        </div>
      )}

      {loadingMovies ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
        </div>
      ) : movies.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-96 p-2">
            {movies.map(movie => (
              <div
                key={movie.id}
                className={`relative rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${!isRoomCreator && 'pointer-events-none opacity-80'
                  } ${selectedMovie?.id === movie.id ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => onSelectMovie(movie)}
              >
                <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-purple-50 to-indigo-100">
                  {movie.coverUrl ? (
                    <img
                      src={movie.coverUrl}
                      alt={movie.title}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x169?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <FilmIcon style={{ fontSize: 48, color: "#7c4dff", opacity: 0.6 }} />
                    </div>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <h3 className="font-semibold text-sm text-gray-800 truncate">{movie.title}</h3>
                  {movie.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{movie.description}</p>
                  )}
                </div>
                {selectedMovie?.id === movie.id && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                    当前播放
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96 pr-2">
            {movies.map(movie => (
              <div
                key={movie.id}
                className={`flex items-center p-3 mb-2 rounded-lg cursor-pointer transition-all ${!isRoomCreator && 'pointer-events-none opacity-80'
                  } ${selectedMovie?.id === movie.id
                    ? 'bg-purple-100 border-purple-300'
                    : 'bg-white hover:bg-gray-50 border-gray-100'
                  } border shadow-sm hover:-translate-x-1`}
                onClick={() => onSelectMovie(movie)}
              >
                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 p-3 rounded-lg mr-3">
                  <FilmIcon style={{ fontSize: 24, color: "#7c4dff" }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{movie.title}</h3>
                  {movie.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{movie.description}</p>
                  )}
                </div>
                {selectedMovie?.id === movie.id && (
                  <span className="ml-2 px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
                    当前播放
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-10 text-gray-500">
          暂无可用电影
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={onOpenUploadDialog}
          className="px-4 py-2.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
        >
          <FileUploadIcon />
          上传新电影
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          关闭
        </button>
      </div>
    </>
  );
};

export default MovieSelector;