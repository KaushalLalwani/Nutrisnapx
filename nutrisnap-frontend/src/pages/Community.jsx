import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Upload, Search } from "lucide-react";
import { communityAPI } from "../services/api";
import GlassCard from "../components/GlassCard";
import SkeletonLoader from "../components/SkeletonLoader";
import { useAuth } from "../context/AuthContext";

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, [page]);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await communityAPI.getFeed(page, 10, searchTerm || null);
      setPosts(res.data.posts || []);
      setHasMore(res.data.has_more || false);
    } catch (err) {
      console.error("Feed fetch failed:", err);
      setError("Failed to load community feed");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchFeed();
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <SkeletonLoader count={4} type="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent mb-4 drop-shadow-lg">
            Community Feed
          </h1>
          <p className="text-white text-lg">
            Discover and share healthy meals with our community
          </p>
        </motion.div>

        {/* Create Post & Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 space-y-6"
        >
          {/* Create Post Card */}
          {user && <CreatePostCard onPostCreated={fetchFeed} />}

          {/* Search Bar */}
          <GlassCard className="p-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-3 text-white"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search meals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSearch}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white font-semibold rounded-lg"
              >
                Search
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-red-700"
          >
            {error}
          </motion.div>
        )}

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          >
            {posts.map((post, i) => (
              <PostCard key={i} post={post} onLike={fetchFeed} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-white text-lg">
              No posts found. Be the first to share!
            </p>
          </motion.div>
        )}

        {/* Pagination */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center text-white gap-4 mt-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="px-6 py-3 border border-slate-300 rounded-lg font-medium hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </motion.button>
          <span className="px-6 py-3 text-white font-medium">
            Page {page}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-3 text-white border border-slate-300 rounded-lg font-medium hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

/* ---- CREATE POST ---- */
function CreatePostCard({ onPostCreated }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (!image || !caption.trim()) {
      setError("Please add an image and caption");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append("image", image);
      formData.append("caption", caption);

      await communityAPI.createPost(formData);
      setImage(null);
      setCaption("");
      onPostCreated();
    } catch (err) {
      console.error("Post creation failed:", err);
      setError("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-bold text-white mb-4">Share Your Meal</h3>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="space-y-4">
        {/* Image Upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-teal-500 transition-colors"
        >
          {image ? (
            <div className="text-center">
              <p className="font-medium text-white mb-2">{image.name}</p>
              <p className="text-sm text-white">
                Click to change image
              </p>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="mx-auto text-white mb-2" size={24} />
              <p className="font-medium text-white">Upload a food image</p>
              <p className="text-sm text-white">JPG, PNG up to 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Caption */}
        <textarea
          placeholder="What's in your meal? Share some insights..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={loading || !image || !caption.trim()}
          className="w-full py-3 bg-gradient-to-r from-teal-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Posting..." : "Share Post"}
        </motion.button>
      </div>
    </GlassCard>
  );
}

/* ---- POST CARD ---- */
function PostCard({ post, onLike }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [liking, setLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [error, setError] = useState("");

  const handleLike = async () => {
    try {
      setLiking(true);
      await communityAPI.likePost(post._id);
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
      onLike?.();
    } catch (err) {
      console.error("Like failed:", err);
    } finally {
      setLiking(false);
    }
  };

  const handleShowComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    try {
      setLoadingComments(true);
      const res = await communityAPI.getComments(post._id);
      setComments(res.data.comments || []);
      setShowComments(true);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setError("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    try {
      setPostingComment(true);
      setError("");
      await communityAPI.commentPost(post._id, { comment: commentText });
      setCommentText("");
      // Reload comments
      const res = await communityAPI.getComments(post._id);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Comment failed:", err);
      setError("Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await communityAPI.deleteComment(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete comment");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard className="overflow-hidden h-full flex flex-col hover:shadow-xl">
        {/* Image */}
        {post.image_url && (
          <div className="relative h-64 overflow-hidden">
            <img
              src={post.image_url}
              alt="Post"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Author & Date */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-white">
                {post.author_email?.split("@")[0] || "Anonymous"}
              </p>
              <p className="text-xs text-white">
                {post.created_at
                  ? new Date(post.created_at).toLocaleDateString()
                  : "Recently"}
              </p>
            </div>
          </div>

          {/* Caption */}
          <p className="text-white mb-4 flex-1">{post.caption}</p>

          {/* Nutrition Preview */}
          {post.nutrition && (
            <div className="bg-white/50 backdrop-blur rounded-lg p-3 mb-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-white">Calories</p>
                <p className="font-semibold">
                  {Math.round(post.nutrition.calories || 0)}
                </p>
              </div>
              <div>
                <p className="text-white">Protein</p>
                <p className="font-semibold">
                  {Math.round(post.nutrition.protein || 0)}g
                </p>
              </div>
              <div>
                <p className="text-white">Carbs</p>
                <p className="font-semibold">
                  {Math.round(post.nutrition.carbs || 0)}g
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-200">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                liked ? "text-red-500" : "text-white hover:text-red-500"
              }`}
            >
              <Heart size={18} fill={liked ? "currentColor" : "none"} />
              <span>{likeCount}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShowComments}
              disabled={loadingComments}
              className="flex items-center gap-2 text-sm font-medium text-white hover:text-teal-600 transition-colors"
            >
              <MessageCircle size={18} />
              <span>{comments.length}</span>
            </motion.button>

            <button className="flex items-center gap-2 text-sm font-medium text-white hover:text-blue-600 transition-colors">
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="mt-6 pt-6 border-t border-slate-200 space-y-4"
            >
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment._id} className="bg-white/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm text-white">
                          {comment.user_email?.split("@")[0] || "Anonymous"}
                        </p>
                        {user && comment.user_id === user._id && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Delete
                          </motion.button>
                        )}
                      </div>
                      <p className="text-sm text-white">{comment.comment}</p>
                      <p className="text-xs text-white mt-2">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white text-center py-4">
                    No comments yet
                  </p>
                )}
              </div>

              {/* Comment Input */}
              {user && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handlePostComment()
                    }
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePostComment}
                    disabled={postingComment || !commentText.trim()}
                    className="px-3 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
                  >
                    {postingComment ? "..." : "Post"}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

