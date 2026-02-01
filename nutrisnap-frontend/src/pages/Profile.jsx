import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Users, TrendingUp, Heart, MessageCircle, Share2, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import GlassCard from "../components/GlassCard";
import SkeletonLoader from "../components/SkeletonLoader";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Always use /me endpoint for current user
      const [profileRes, postsRes] = await Promise.all([
        profileAPI.getMyProfile(),
        profileAPI.getMyPosts(),
      ]);
      
      setProfile(profileRes.data || {});
      setPosts(postsRes.data?.posts || []);
    } catch (err) {
      console.error("Profile fetch failed:", err);
      setError("Failed to load profile. Please log out and log back in.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 pt-28">
        <div className="max-w-5xl mx-auto">
          <SkeletonLoader count={3} type="card" />
        </div>
      </div>
    );
  }

  if (error || !profile?.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Unable to Load Profile</h2>
          <p className="text-gray-400 mb-6">{error || "Profile data not available"}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 perspective relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 pt-20 relative z-10">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-950/30 border border-red-600/50 rounded-xl p-4 mb-8 text-red-300 backdrop-blur-md shadow-2xl shadow-red-500/20"
          >
            {error}
          </motion.div>
        )}

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <div 
            className="relative group"
            style={{
              transform: "translateZ(50px)",
            }}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <GlassCard className="relative p-8 mb-8 shadow-2xl shadow-teal-500/20 border border-slate-700/50 backdrop-blur-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                {/* Avatar with 3D effect */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="relative group"
                  style={{
                    transform: "translateZ(50px)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition duration-300"></div>
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-teal-400/50 border-2 border-teal-300/30">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <motion.div 
                    animate={{ 
                      boxShadow: ["0 0 10px rgba(20, 184, 166, 0.5)", "0 0 20px rgba(20, 184, 166, 0.8)", "0 0 10px rgba(20, 184, 166, 0.5)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-900"
                  />
                </motion.div>

                {/* Info */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex-1"
                  style={{
                    transform: "translateZ(30px)",
                  }}
                >
                  <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                    {profile?.display_name || user?.email?.split("@")[0]}
                  </h1>
                  <p className="flex items-center gap-2 text-cyan-300 mb-4">
                    <Mail size={18} />
                    {user?.email}
                  </p>
                  <p className="text-white">
                    Member since{" "}
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "recently"}
                  </p>
                </motion.div>
              </div>
            </GlassCard>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* Total Posts */}
          <motion.div
            whileHover={{ y: -10, rotateX: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="group relative"
            style={{
              perspective: "1000px",
            }}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
            <GlassCard className="relative p-6 text-center shadow-2xl shadow-teal-500/20 border border-slate-700/50 backdrop-blur-xl h-full">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-teal-950/50 rounded-full border border-teal-500/30 shadow-lg shadow-teal-500/20">
                  <TrendingUp className="text-teal-400" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">
                {profile?.total_posts || posts.length || 0}
              </p>
              <p className="text-white">Posts Shared</p>
            </GlassCard>
          </motion.div>

          {/* Total Likes */}
          <motion.div
            whileHover={{ y: -10, rotateX: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="group relative"
            style={{
              perspective: "1000px",
            }}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
            <GlassCard className="relative p-6 text-center shadow-2xl shadow-red-500/20 border border-slate-700/50 backdrop-blur-xl h-full">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-red-950/50 rounded-full border border-red-500/30 shadow-lg shadow-red-500/20">
                  <Heart className="text-red-400" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">
                {profile?.total_likes || 0}
              </p>
              <p className="text-white">Likes Received</p>
            </GlassCard>
          </motion.div>

          {/* Community Rank */}
          <motion.div
            whileHover={{ y: -10, rotateX: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="group relative"
            style={{
              perspective: "1000px",
            }}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
            <GlassCard className="relative p-6 text-center shadow-2xl shadow-blue-500/20 border border-slate-700/50 backdrop-blur-xl h-full">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-blue-950/50 rounded-full border border-blue-500/30 shadow-lg shadow-blue-500/20">
                  <Users className="text-blue-400" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">
                {profile?.rank || "Community"}
              </p>
              <p className="text-white">Member Status</p>
            </GlassCard>
          </motion.div>
        </motion.div>

        {/* Posts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-lg">
            Recent Posts
          </h2>

          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative"
                  style={{
                    perspective: "1200px",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-500 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition duration-500"></div>
                  <GlassCard className="relative overflow-hidden h-full flex flex-col shadow-2xl shadow-cyan-500/10 border border-slate-700/50 backdrop-blur-xl group-hover:shadow-cyan-500/30 group-hover:border-cyan-500/30 transition-all duration-300">
                    {/* Image with Camera Icon */}
                    {post.image_url && (
                      <div className="relative h-56 overflow-hidden group/image">
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-full h-full object-cover group-hover/image:scale-125 transition-transform duration-500"
                          style={{
                            filter: "brightness(0.9) contrast(1.1)",
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, 5, 0]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Camera className="text-cyan-400" size={40} />
                          </motion.div>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      {/* Date */}
                      <p className="text-xs text-white mb-3">
                        {post.created_at
                          ? new Date(post.created_at).toLocaleDateString()
                          : "Recently"}
                      </p>

                      {/* Caption */}
                      <p className="text-slate-200 mb-4 flex-1 line-clamp-3">
                        {post.caption}
                      </p>

                      {/* Nutrition Preview */}
                      {post.nutrition && (
                        <div className="bg-slate-800/60 backdrop-blur rounded-lg p-3 mb-4 grid grid-cols-3 gap-2 text-sm border border-slate-700/50 shadow-lg shadow-teal-500/10">
                          <div className="hover:bg-slate-700/50 rounded p-2 transition-colors">
                            <p className="text-white text-xs">Calories</p>
                            <p className="font-semibold text-white">
                              {Math.round(post.nutrition.calories || 0)}
                            </p>
                          </div>
                          <div className="hover:bg-slate-700/50 rounded p-2 transition-colors">
                            <p className="text-white text-xs">Protein</p>
                            <p className="font-semibold text-white">
                              {Math.round(post.nutrition.protein || 0)}g
                            </p>
                          </div>
                          <div className="hover:bg-slate-700/50 rounded p-2 transition-colors">
                            <p className="text-white text-xs">Carbs</p>
                            <p className="font-semibold text-white">
                              {Math.round(post.nutrition.carbs || 0)}g
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-4 pt-4 border-t border-slate-700/50 text-white text-sm">
                        <button className="flex items-center gap-1 hover:text-red-400 transition-colors hover:scale-110 transform">
                          <Heart size={16} />
                          <span>{post.likes_count || 0}</span>
                        </button>

                        <button className="flex items-center gap-1 hover:text-cyan-400 transition-colors hover:scale-110 transform">
                          <MessageCircle size={16} />
                          <span>{post.comments_count || 0}</span>
                        </button>

                        <button className="flex items-center gap-1 hover:text-teal-400 transition-colors hover:scale-110 transform">
                          <Share2 size={16} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <GlassCard className="relative p-12 text-center shadow-2xl shadow-slate-500/10 border border-slate-700/50 backdrop-blur-xl">
                <p className="text-white text-lg">No posts yet.</p>
                <p className="text-white mt-2">
                  Share your first meal in the community!
                </p>
              </GlassCard>
            </div>
          )}
        </motion.div>

        {/* Bio Section */}
        {profile?.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <h3 className="text-lg font-bold text-white mb-4 drop-shadow-lg">About</h3>
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <GlassCard className="relative p-6 shadow-2xl shadow-purple-500/20 border border-slate-700/50 backdrop-blur-xl">
                <p className="text-slate-200">{profile.bio}</p>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
