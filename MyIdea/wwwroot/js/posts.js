class PostService {
    constructor() {
        this.posts = JSON.parse(localStorage.getItem('myidea_posts')) || [];
    }

    async createPost(text, imageData = null, aiAnalysis = null) {
        try {
            const user = window.authService.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            const post = {
                id: Date.now().toString(),
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar,
                text,
                image: imageData,
                aiAnalysis,
                timestamp: new Date().toISOString(),
                likes: [],
                comments: [],
                shares: 0
            };

            this.posts.unshift(post);
            this.savePosts();
            return post;
        } catch (error) {
            console.error('Create post failed:', error);
            throw error;
        }
    }

    savePosts() {
        localStorage.setItem('myidea_posts', JSON.stringify(this.posts));
    }

    getPosts() {
        return this.posts;
    }

    getUserPosts(userId) {
        return this.posts.filter(post => post.userId === userId);
    }

    async likePost(postId) {
        const user = window.authService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        const post = this.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        const liked = post.likes.includes(user.id);
        if (liked) {
            post.likes = post.likes.filter(id => id !== user.id);
        } else {
            post.likes.push(user.id);
        }

        this.savePosts();
        return !liked;
    }

    async sharePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');
        post.shares = (post.shares || 0) + 1;
        this.savePosts();
        return post.shares;
    }

    async addComment(postId, text) {
        const user = window.authService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        const post = this.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        const comment = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            text,
            timestamp: new Date().toISOString(),
            replies: []
        };

        post.comments.push(comment);
        this.savePosts();
        // Notify post owner
        try {
            if (post.userId !== user.id && window.uiService && typeof window.uiService.addNotificationForUser === 'function') {
                window.uiService.addNotificationForUser(post.userId, {
                    id: Date.now().toString(),
                    type: 'comment',
                    text: `${user.name} commented: ${comment.text.substring(0,80)}`,
                    postId: post.id,
                    fromUserId: user.id,
                    timestamp: new Date().toISOString(),
                    read: false
                });
            }
        } catch (err) { console.warn('Notify failed', err); }
        return comment;
    }

    async addReply(postId, commentId, text) {
        const user = window.authService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        const post = this.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) throw new Error('Comment not found');

        const reply = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            text,
            timestamp: new Date().toISOString()
        };

        comment.replies.push(reply);
        this.savePosts();
        // Notify original commenter and post owner (if different)
        try {
            if (comment.userId !== user.id && window.uiService && typeof window.uiService.addNotificationForUser === 'function') {
                window.uiService.addNotificationForUser(comment.userId, {
                    id: Date.now().toString(),
                    type: 'reply',
                    text: `${user.name} replied: ${reply.text.substring(0,80)}`,
                    postId: post.id,
                    fromUserId: user.id,
                    timestamp: new Date().toISOString(),
                    read: false
                });
            }
            if (post.userId !== user.id && post.userId !== comment.userId && window.uiService && typeof window.uiService.addNotificationForUser === 'function') {
                window.uiService.addNotificationForUser(post.userId, {
                    id: Date.now().toString(),
                    type: 'reply',
                    text: `${user.name} replied in a thread on your post`,
                    postId: post.id,
                    fromUserId: user.id,
                    timestamp: new Date().toISOString(),
                    read: false
                });
            }
        } catch (err) { console.warn('Notify failed', err); }
        return reply;
    }

    async deletePost(postId) {
        const user = window.authService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        const index = this.posts.findIndex(p => p.id === postId && p.userId === user.id);
        if (index === -1) throw new Error('Post not found or unauthorized');

        this.posts.splice(index, 1);
        this.savePosts();
        return true;
    }
}

window.postService = new PostService();