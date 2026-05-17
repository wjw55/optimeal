import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../auth/firebase';
import AppNav from '../shared/AppNav';
import './Social.css';

function Social() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const currentUser = auth.currentUser;

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const titleText = post.title || '';
      const descriptionText = post.description || '';
      return `${titleText} ${descriptionText}`.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [posts, searchQuery]);

  const getUsernameByUID = async (uid) => {
    if (!uid) return 'Community member';
    if (uid === currentUser?.uid) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      return userSnap.exists() ? (userSnap.data().username || currentUser.email || 'Community member') : 'Community member';
    }
    return 'Community member';
  };

  const handleImageUpload = async () => {
    if (!image || !currentUser) return '';
    const imageRef = ref(storage, `forumImages/${currentUser.uid}/${Date.now()}-${image.name}`);
    await uploadBytes(imageRef, image);
    return getDownloadURL(imageRef);
  };

  const handleSubmitPost = async (event) => {
    event.preventDefault();
    setError('');

    if (!title.trim() || !description.trim() || !currentUser) {
      setError('Add a title and description before posting.');
      return;
    }

    try {
      const uploadedUrl = await handleImageUpload();
      const username = await getUsernameByUID(currentUser.uid);

      await addDoc(collection(db, 'forumPosts'), {
        userId: currentUser.uid,
        username,
        title: title.trim(),
        description: description.trim(),
        imageUrl: uploadedUrl,
        timestamp: serverTimestamp(),
        likes: []
      });

      setTitle('');
      setDescription('');
      setImage(null);
      setNotice('Post shared.');
      setTimeout(() => setNotice(''), 2500);
      fetchAllPosts();
    } catch (postError) {
      console.error('Error creating post:', postError);
      setError('Post could not be shared. Please try again.');
    }
  };

  const fetchCommentsForPost = useCallback(async (postId) => {
    const commentsQuery = query(collection(db, 'forumPosts', postId, 'comments'), orderBy('timestamp'));
    const snapshot = await getDocs(commentsQuery);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }, []);

  const fetchAllPosts = useCallback(async () => {
    try {
      const postsQuery = query(collection(db, 'forumPosts'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(postsQuery);
      const allPosts = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setPosts(allPosts);

      const commentsByPost = {};
      await Promise.all(allPosts.map(async (post) => {
        commentsByPost[post.id] = await fetchCommentsForPost(post.id);
      }));
      setComments(commentsByPost);
    } catch (fetchError) {
      console.error('Error loading community posts:', fetchError);
      setError('Community posts could not be loaded. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchCommentsForPost]);

  useEffect(() => {
    fetchAllPosts();
  }, [fetchAllPosts]);

  const handleDeletePost = async (postId) => {
    const confirmDelete = window.confirm('Delete this community post?');
    if (!confirmDelete) return;

    try {
      const commentsRef = collection(db, 'forumPosts', postId, 'comments');
      const commentsSnap = await getDocs(commentsRef);
      await Promise.all(commentsSnap.docs.map((commentDoc) => deleteDoc(commentDoc.ref)));
      await deleteDoc(doc(db, 'forumPosts', postId));

      setPosts((current) => current.filter((post) => post.id !== postId));
      setComments((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      setNotice('Post deleted.');
      setTimeout(() => setNotice(''), 2500);
    } catch (deleteError) {
      console.error('Error deleting post:', deleteError);
      setError('Post could not be deleted.');
    }
  };

  const toggleLike = async (post) => {
    if (!currentUser) return;
    const currentLikes = post.likes || [];
    const hasLiked = currentLikes.includes(currentUser.uid);
    const updatedLikes = hasLiked
      ? currentLikes.filter((uid) => uid !== currentUser.uid)
      : [...currentLikes, currentUser.uid];

    await updateDoc(doc(db, 'forumPosts', post.id), { likes: updatedLikes });
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: updatedLikes } : item));
  };

  const handleComment = async (postId) => {
    const draft = commentDrafts[postId]?.trim();
    if (!draft || !currentUser) return;

    const username = await getUsernameByUID(currentUser.uid);
    await addDoc(collection(db, 'forumPosts', postId, 'comments'), {
      userId: currentUser.uid,
      username,
      text: draft,
      timestamp: serverTimestamp()
    });

    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    const updatedComments = await fetchCommentsForPost(postId);
    setComments((current) => ({ ...current, [postId]: updatedComments }));
  };

  return (
    <div>
      <AppNav />
      <main className="community-page">
        <section className="community-hero">
          <div>
            <p className="community-kicker">Community Recipes</p>
            <h1>Community</h1>
            <p>Share meal ideas, recipe notes, and practical food wins with other Optimeal users.</p>
          </div>
        </section>

        {error && <div className="community-alert community-alert--error">{error}</div>}
        {notice && <div className="community-alert">{notice}</div>}

        <section className="community-layout">
          <form className="community-post-form" onSubmit={handleSubmitPost}>
            <h2>Create Post</h2>
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="High-protein lunch idea" />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Share the recipe, prep notes, or what worked well." />
            </label>
            <label>
              Image
              <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files[0])} />
            </label>
            <button type="submit">Submit Post</button>
          </form>

          <section className="community-feed">
            <div className="community-toolbar">
              <div>
                <p className="community-kicker">Feed</p>
                <h2>Latest posts</h2>
              </div>
              <label>
                Search
                <input type="text" placeholder="Search posts" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
              </label>
            </div>

            {loading ? (
              <p className="community-empty">Loading community posts...</p>
            ) : filteredPosts.length === 0 ? (
              <div className="community-empty">
                <h3>No posts found.</h3>
                <p>Start the conversation with a recipe or meal prep idea.</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <article key={post.id} className="community-post">
                  <div className="community-post__header">
                    <div>
                      <h3>{post.title}</h3>
                      <p>Posted by {post.username || 'Community member'}</p>
                    </div>
                    {post.userId === currentUser?.uid && (
                      <button type="button" onClick={() => handleDeletePost(post.id)}>Delete</button>
                    )}
                  </div>
                  <p>{post.description}</p>
                  {post.imageUrl && <img src={post.imageUrl} alt="" />}
                  <div className="community-post__actions">
                    <button type="button" onClick={() => toggleLike(post)}>
                      {(post.likes || []).includes(currentUser?.uid) ? 'Unlike' : 'Like'} ({(post.likes || []).length})
                    </button>
                  </div>

                  <div className="comments-section">
                    <h4>Comments</h4>
                    {(comments[post.id] || []).length ? (
                      <ul>
                        {(comments[post.id] || []).map((comment) => (
                          <li key={comment.id}>
                            <strong>{comment.username || 'Community member'}</strong>
                            <span>{comment.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No comments yet.</p>
                    )}
                    <div className="comment-form">
                      <input
                        placeholder="Add a comment"
                        value={commentDrafts[post.id] || ''}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                      />
                      <button type="button" onClick={() => handleComment(post.id)}>Post Comment</button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default Social;
