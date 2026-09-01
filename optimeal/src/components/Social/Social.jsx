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
import Alert from '../ui/Alert';
import LoadingPanel from '../ui/LoadingPanel';
import Modal from '../ui/Modal';
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
  const [imagePreview, setImagePreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [pendingPostId, setPendingPostId] = useState('');
  const [postPendingDelete, setPostPendingDelete] = useState(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!image) {
      setImagePreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(image);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [image]);

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

    setPosting(true);
    try {
      let uploadedUrl = '';
      try {
        uploadedUrl = await handleImageUpload();
      } catch (uploadError) {
        console.error('Image upload failed; continuing with text-only post:', uploadError);
        setNotice('Image upload is unavailable, so the post will be shared without an image.');
      }

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
    } finally {
      setPosting(false);
    }
  };

  const handleImageChange = (event) => {
    const selectedImage = event.target.files?.[0] || null;
    setError('');
    if (!selectedImage) {
      setImage(null);
      return;
    }
    if (!selectedImage.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, WebP, or GIF image.');
      event.target.value = '';
      return;
    }
    if (selectedImage.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB.');
      event.target.value = '';
      return;
    }
    setImage(selectedImage);
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
    setPendingPostId(postId);
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
      setPostPendingDelete(null);
      setTimeout(() => setNotice(''), 2500);
    } catch (deleteError) {
      console.error('Error deleting post:', deleteError);
      setError('Post could not be deleted.');
    } finally {
      setPendingPostId('');
    }
  };

  const toggleLike = async (post) => {
    if (!currentUser) return;
    const currentLikes = post.likes || [];
    const hasLiked = currentLikes.includes(currentUser.uid);
    const updatedLikes = hasLiked
      ? currentLikes.filter((uid) => uid !== currentUser.uid)
      : [...currentLikes, currentUser.uid];

    setPendingPostId(post.id);
    try {
      await updateDoc(doc(db, 'forumPosts', post.id), { likes: updatedLikes });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: updatedLikes } : item));
    } catch (likeError) {
      console.error('Error updating like:', likeError);
      setError('Your like could not be saved. Please try again.');
    } finally {
      setPendingPostId('');
    }
  };

  const handleComment = async (postId) => {
    const draft = commentDrafts[postId]?.trim();
    if (!draft || !currentUser) return;

    setPendingPostId(postId);
    try {
      const username = await getUsernameByUID(currentUser.uid);
      await addDoc(collection(db, 'forumPosts', postId, 'comments'), { userId: currentUser.uid, username, text: draft, timestamp: serverTimestamp() });
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      const updatedComments = await fetchCommentsForPost(postId);
      setComments((current) => ({ ...current, [postId]: updatedComments }));
    } catch (commentError) {
      console.error('Error creating comment:', commentError);
      setError('Your comment could not be posted. Please try again.');
    } finally {
      setPendingPostId('');
    }
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

        {error && <Alert variant="error" className="community-alert">{error}</Alert>}
        {notice && <Alert className="community-alert">{notice}</Alert>}

        <section className="community-layout">
          <form className="community-post-form" onSubmit={handleSubmitPost}>
            <h2>Share Recipe</h2>
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
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
            </label>
            <small className="community-file-hint">Optional · JPG, PNG, WebP, or GIF · 5 MB maximum</small>
            {imagePreview && <img className="community-image-preview" src={imagePreview} alt="Selected upload preview" />}
            <button type="submit" disabled={posting}>{posting ? 'Sharing…' : 'Share post'}</button>
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
              <LoadingPanel>Loading community posts…</LoadingPanel>
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
                      <button type="button" onClick={() => setPostPendingDelete(post)}>Delete</button>
                    )}
                  </div>
                  <p>{post.description}</p>
                  {post.imageUrl && <img src={post.imageUrl} alt={`Shared with “${post.title}”`} />}
                  <div className="community-post__actions">
                    <button type="button" onClick={() => toggleLike(post)} disabled={pendingPostId === post.id} aria-pressed={(post.likes || []).includes(currentUser?.uid)}>
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
                      <label className="sr-only" htmlFor={`comment-${post.id}`}>Add a comment to {post.title}</label>
                      <input
                        id={`comment-${post.id}`}
                        placeholder="Add a comment"
                        value={commentDrafts[post.id] || ''}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                      />
                      <button type="button" onClick={() => handleComment(post.id)} disabled={pendingPostId === post.id || !commentDrafts[post.id]?.trim()}>{pendingPostId === post.id ? 'Posting…' : 'Post comment'}</button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </main>
      <Modal
        open={Boolean(postPendingDelete)}
        title="Delete this post?"
        confirmLabel="Delete post"
        danger
        pending={pendingPostId === postPendingDelete?.id}
        onClose={() => setPostPendingDelete(null)}
        onConfirm={() => handleDeletePost(postPendingDelete.id)}
      >
        <p>This removes the post and its comments. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

export default Social;
