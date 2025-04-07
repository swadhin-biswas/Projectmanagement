import { useCallback, useEffect, useRef } from 'react';

export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
  rootMargin = '100px'
}) => {
  const containerRef = useRef(null);
  const observer = useRef(null);

  const handleScroll = useCallback((entries) => {
    const target = entries[0];

    if (target.isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoading]);

  // Set up intersection observer
  useEffect(() => {
    const options = {
      root: null,
      rootMargin,
      threshold: 0
    };

    observer.current = new IntersectionObserver(handleScroll, options);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [handleScroll, rootMargin]);

  // Observe the scroll container
  useEffect(() => {
    const currentRef = containerRef.current;
    const currentObserver = observer.current;

    if (currentRef && currentObserver) {
      currentObserver.observe(currentRef);
    }

    return () => {
      if (currentRef && currentObserver) {
        currentObserver.unobserve(currentRef);
      }
    };
  }, [containerRef.current]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      onLoadMore();
    }
  }, [onLoadMore, isLoading, hasMore]);

  return {
    containerRef,
    loadMore,
    isLoading
  };
};