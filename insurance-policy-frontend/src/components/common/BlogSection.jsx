// ============================================
// FILE: insurance-policy-frontend/src/components/common/BlogSection.jsx
// ✅ NEW: Blog section with pagination and proper paragraph formatting
// ============================================

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://smartdocs365-backend.onrender.com/api';

const BlogSection = ({ limit = 6, showTitle = true }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [expandedBlogs, setExpandedBlogs] = useState({});

  useEffect(() => {
    fetchBlogs(page);
  }, [page]);

  const fetchBlogs = async (pageNum) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/blogs/public`, {
        params: {
          page: pageNum,
          limit: limit
        }
      });

      if (response.data.success) {
        if (pageNum === 1) {
          setBlogs(response.data.data);
        } else {
          setBlogs(prev => [...prev, ...response.data.data]);
        }
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatContent = (content) => {
    if (!content) return '';
    
    // Split by newlines and create paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => (
      <p key={index} style={{ marginBottom: '1rem' }}>
        {paragraph.trim()}
      </p>
    ));
  };

  const truncateContent = (content, maxLength = 200) => {
    if (!content) return '';
    const plainText = content.replace(/\n/g, ' ');
    if (plainText.length <= maxLength) return content;
    return plainText.substring(0, maxLength) + '...';
  };

  const toggleExpanded = (blogId) => {
    setExpandedBlogs(prev => ({
      ...prev,
      [blogId]: !prev[blogId]
    }));
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (loading && page === 1) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div className="loader"></div>
        <p>Loading blogs...</p>
      </div>
    );
  }

  if (!blogs || blogs.length === 0) {
    return null;
  }

  return (
    <section style={{ padding: '4rem 2rem', background: '#f9fafb' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {showTitle && (
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Latest Articles
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Stay informed with our latest insights and updates
            </p>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '2rem'
        }}>
          {blogs.map((blog) => {
            const isExpanded = expandedBlogs[blog.blog_id];
            const shouldTruncate = blog.content && blog.content.length > 200;

            return (
              <article
                key={blog.blog_id}
                style={{
                  background: 'white',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Category Badge */}
                {blog.category && (
                  <span style={{
                    display: 'inline-block',
                    background: '#eff6ff',
                    color: '#3b82f6',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    marginBottom: '1rem'
                  }}>
                    {blog.category}
                  </span>
                )}

                {/* Title */}
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '0.75rem',
                  color: '#111827'
                }}>
                  {blog.title}
                </h3>

                {/* Meta Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {blog.author && (
                    <span>By {blog.author}</span>
                  )}
                  {blog.created_at && (
                    <span>
                      {new Date(blog.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>

                {/* Content with Paragraphs */}
                <div style={{
                  color: '#4b5563',
                  lineHeight: '1.75',
                  fontSize: '0.9375rem'
                }}>
                  {isExpanded || !shouldTruncate ? (
                    formatContent(blog.content)
                  ) : (
                    <p>{truncateContent(blog.content)}</p>
                  )}
                </div>

                {/* Read More Button */}
                {shouldTruncate && (
                  <button
                    onClick={() => toggleExpanded(blog.blog_id)}
                    style={{
                      marginTop: '1rem',
                      color: '#3b82f6',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                  >
                    {isExpanded ? 'Show Less' : 'Read More'}
                    <span>{isExpanded ? '↑' : '→'}</span>
                  </button>
                )}
              </article>
            );
          })}
        </div>

        {/* Load More Button */}
        {pagination && pagination.hasMore && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button
              onClick={loadMore}
              disabled={loading}
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? 'Loading...' : `Show More (${pagination.totalBlogs - blogs.length} more)`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;