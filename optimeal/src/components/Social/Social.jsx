import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../auth/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import './Social.css';
import { Link, useNavigate } from 'react-router-dom';

function ForumPost() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState({}); // comments per postId
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };


  const currentUser = auth.currentUser;
  const getUsernameByUID = async (uid) => {
    const userSnap = await getDoc(doc(db, "users", uid));
    return userSnap.exists() ? (userSnap.data().username || "Unknown") : "Unknown";
  };


  // Upload image to storage
  const handleImageUpload = async () => {
    if (!image) return '';
    const imageRef = ref(storage, `forumImages/${Date.now()}-${image.name}`);
    await uploadBytes(imageRef, image);
    return await getDownloadURL(imageRef);
  };

  const handleSubmitPost = async () => {
    let uploadedUrl = '';
    if (image) {
      uploadedUrl = await handleImageUpload();
    }
    const username = await getUsernameByUID(currentUser.uid);

    await addDoc(collection(db, 'forumPosts'), {
      userId: currentUser.uid,
      username,
      title,
      description,
      imageUrl: uploadedUrl,
      timestamp: serverTimestamp(),
      likes: []
    });

    setTitle('');
    setDescription('');
    setImage(null);
    fetchAllPosts();
  };

  const fetchAllPosts = async () => {
    const q = query(collection(db, 'forumPosts'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPosts(allPosts);
  };

  const handleDeletePost = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this post?");
    if (!confirmDelete) return;

    try {
      // Delete all comments
      const commentsRef = collection(db, "forumPosts", id, "comments");
      const commentsSnap = await getDocs(commentsRef);
      for (const commentDoc of commentsSnap.docs) {
        await deleteDoc(commentDoc.ref);
      }

      // Delete the post
      await deleteDoc(doc(db, "forumPosts", id));

      // Remove post + comments from local state
      setComments(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setPosts(prev => prev.filter(post => post.id !== id));

      alert("Post deleted successfully!");
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };


  const toggleLike = async (postId, currentLikes) => {
    const postRef = doc(db, 'forumPosts', postId);
    const hasLiked = currentLikes.includes(currentUser.uid);
    const updatedLikes = hasLiked
      ? currentLikes.filter(uid => uid !== currentUser.uid)
      : [...currentLikes, currentUser.uid];

    await updateDoc(postRef, { likes: updatedLikes });
    fetchAllPosts();
  };

  const handleComment = async (postId) => {
    const username = await getUsernameByUID(currentUser.uid);

    await addDoc(collection(db, 'forumPosts', postId, 'comments'), {
      userId: currentUser.uid,
      username,
      text: commentInput,
      timestamp: serverTimestamp()
    });

    setCommentInput('');
    fetchComments(postId);
  };

  const fetchComments = async (postId) => {
    const q = query(collection(db, 'forumPosts', postId, 'comments'), orderBy('timestamp'));
    const snapshot = await getDocs(q);
    const commentsArr = snapshot.docs.map(doc => doc.data());
    setComments(prev => ({ ...prev, [postId]: commentsArr }));
  };

  useEffect(() => {
    fetchAllPosts();
  }, []);
  const filteredPosts = posts.filter(post =>
  post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
  post.description.toLowerCase().includes(searchQuery.toLowerCase())
);


return (
  <div className="App">
    {/* Navbar */}
    <div className="navbar">
      <div className="branding">
        <h1>OPTIMEAL</h1>
      </div>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/recipes">Recipes</Link>
        <Link to="/grocery">Grocery List</Link>
        <Link to="/social">Forum</Link>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </nav>
    </div>

    {/* Forum Page */}
    <div className="forum-post-container">
      <h2>Create Forum Post</h2>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input type="file" onChange={(e) => setImage(e.target.files[0])} />
      <button onClick={handleSubmitPost}>Submit Post</button>

      {/* 🔍 Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Display filtered posts or "No results" */}
      {searchQuery && filteredPosts.length === 0 ? (
        <p>No results found for "{searchQuery}".</p>
      ) : (
        filteredPosts.map(post => (
          <div key={post.id} className="post">
            <h3>{post.title}</h3>
            <p>{post.description}</p>
            {post.imageUrl && <img src={post.imageUrl} alt="Post" width="300px" />}
            <p>Posted by: {post.username}</p>
            {post.userId === currentUser.uid && (
              <button onClick={() => handleDeletePost(post.id)} className="delete-btn">
                Delete Post
              </button>
              </button>
            )}
            <button onClick={() => toggleLike(post.id, post.likes)}>
              {post.likes?.includes(currentUser.uid) ? 'Unlike' : 'Like'} ({post.likes?.length || 0})
            </button>
            <button onClick={() => toggleLike(post.id, post.likes)}>
              {post.likes?.includes(currentUser.uid) ? 'Unlike' : 'Like'} ({post.likes?.length || 0})
            </button>

            <div className="comments-section">
              <h4>Comments</h4>
              <ul>
                {(comments[post.id] || []).map((comment, idx) => (
                  <li key={idx}><strong>{comment.username}</strong>: {comment.text}</li>
                ))}
              </ul>
              <input
                placeholder="Add a comment"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
              />
              <button onClick={() => handleComment(post.id)}>Post Comment</button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);


}

export default ForumPost;