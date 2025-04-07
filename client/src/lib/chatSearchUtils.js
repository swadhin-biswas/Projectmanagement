// Search modes for chat messages
export const SEARCH_MODES = {
  ALL: 'all',
  ANNOUNCEMENTS: 'announcements',
  FILES: 'files',
  IMAGES: 'images',
  FROM_USER: 'from_user'
};

// Filter messages based on search criteria
export const filterMessages = (messages, { searchTerm, mode, userId }) => {
  if (!searchTerm && mode === SEARCH_MODES.ALL) {
    return messages;
  }

  return messages.filter(message => {
    // Apply search term filter if provided
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const contentMatch = message.content.toLowerCase().includes(searchLower);
      const senderMatch = message.sender.fullName.toLowerCase().includes(searchLower);

      if (!contentMatch && !senderMatch) {
        return false;
      }
    }

    // Apply mode filters
    switch (mode) {
      case SEARCH_MODES.ANNOUNCEMENTS:
        return message.isAnnouncement;

      case SEARCH_MODES.FILES:
        return message.attachments?.some(a => a.type === 'file');

      case SEARCH_MODES.IMAGES:
        return message.attachments?.some(a => a.type === 'image');

      case SEARCH_MODES.FROM_USER:
        return userId && message.sender._id === userId;

      default:
        return true;
    }
  });
};

// Group messages by date for better organization
export const groupMessagesByDate = (messages) => {
  const groups = new Map();

  messages.forEach(message => {
    const date = new Date(message.timestamp).toLocaleDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date).push(message);
  });

  // Convert map to array and sort by date
  return Array.from(groups.entries())
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([date, messages]) => ({
      date,
      messages: messages.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )
    }));
};

// Extract search highlights from message content
export const getSearchHighlights = (content, searchTerm) => {
  if (!searchTerm) return [{ text: content, isHighlight: false }];

  const parts = [];
  const searchLower = searchTerm.toLowerCase();
  let lastIndex = 0;

  content.toLowerCase().split(searchLower).forEach((part, i, arr) => {
    if (i > 0) {
      // Add highlighted search term
      const highlightStart = lastIndex + part.length;
      const highlightEnd = highlightStart + searchTerm.length;
      parts.push({
        text: content.slice(lastIndex, highlightStart),
        isHighlight: false
      });
      parts.push({
        text: content.slice(highlightStart, highlightEnd),
        isHighlight: true
      });
      lastIndex = highlightEnd;
    } else {
      // Add non-highlighted part
      const end = lastIndex + part.length;
      if (end > lastIndex) {
        parts.push({
          text: content.slice(lastIndex, end),
          isHighlight: false
        });
        lastIndex = end;
      }
    }

    // Add remaining text for last part
    if (i === arr.length - 1 && lastIndex < content.length) {
      parts.push({
        text: content.slice(lastIndex),
        isHighlight: false
      });
    }
  });

  return parts;
};

// Generate search suggestions based on recent searches and context
export const getSearchSuggestions = (recentSearches, messages) => {
  const suggestions = new Set();

  // Add recent searches
  recentSearches.forEach(search => suggestions.add(search));

  // Add team member names
  const memberNames = new Set(
    messages.map(m => m.sender.fullName)
  );
  memberNames.forEach(name => suggestions.add(name));

  // Add file types from attachments
  messages.forEach(message => {
    message.attachments?.forEach(attachment => {
      const extension = attachment.name.split('.').pop()?.toLowerCase();
      if (extension) {
        suggestions.add(`.${extension}`);
      }
    });
  });

  return Array.from(suggestions).slice(0, 5);
};

// Search strategies
const SEARCH_STRATEGIES = {
  EXACT: 'exact',
  FUZZY: 'fuzzy',
  REGEX: 'regex'
};

// Score thresholds for fuzzy search
const SCORE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4
};

// Calculate Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1, str2) => {
  const matrix = Array(str2.length + 1).fill().map(() =>
    Array(str1.length + 1).fill(0)
  );

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  return matrix[str2.length][str1.length];
};

// Calculate similarity score between two strings
const calculateSimilarity = (str1, str2) => {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLength);
};

// Search messages using exact match
const exactSearch = (messages, query) => {
  const normalizedQuery = query.toLowerCase();
  return messages.filter(message =>
    message.content.toLowerCase().includes(normalizedQuery)
  );
};

// Search messages using fuzzy matching
const fuzzySearch = (messages, query) => {
  const results = messages.map(message => {
    const score = calculateSimilarity(
      message.content.toLowerCase(),
      query.toLowerCase()
    );
    return { message, score };
  });

  return results
    .filter(result => result.score >= SCORE_THRESHOLDS.LOW)
    .sort((a, b) => b.score - a.score)
    .map(result => ({
      ...result.message,
      relevance: result.score >= SCORE_THRESHOLDS.HIGH ? 'high' :
                result.score >= SCORE_THRESHOLDS.MEDIUM ? 'medium' : 'low'
    }));
};

// Search messages using regex
const regexSearch = (messages, pattern) => {
  try {
    const regex = new RegExp(pattern, 'i');
    return messages.filter(message => regex.test(message.content));
  } catch (error) {
    console.error('Invalid regex pattern:', error);
    return [];
  }
};

// Search within date range
const searchByDateRange = (messages, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  return messages.filter(message => {
    const messageDate = new Date(message.timestamp);
    if (start && messageDate < start) return false;
    if (end && messageDate > end) return false;
    return true;
  });
};

// Search by sender
const searchBySender = (messages, senderId) => {
  return messages.filter(message => message.sender._id === senderId);
};

// Search by message type
const searchByType = (messages, type) => {
  switch (type) {
    case 'announcement':
      return messages.filter(message => message.isAnnouncement);
    case 'attachment':
      return messages.filter(message => message.attachments?.length > 0);
    case 'text':
      return messages.filter(message =>
        !message.isAnnouncement && (!message.attachments || message.attachments.length === 0)
      );
    default:
      return messages;
  }
};

// Main search function
export const searchMessages = (messages, options) => {
  const {
    query,
    strategy = SEARCH_STRATEGIES.FUZZY,
    startDate,
    endDate,
    senderId,
    type,
    limit
  } = options;

  let results = [...messages];

  // Apply date range filter
  if (startDate || endDate) {
    results = searchByDateRange(results, startDate, endDate);
  }

  // Apply sender filter
  if (senderId) {
    results = searchBySender(results, senderId);
  }

  // Apply type filter
  if (type) {
    results = searchByType(results, type);
  }

  // Apply text search if query is provided
  if (query) {
    switch (strategy) {
      case SEARCH_STRATEGIES.EXACT:
        results = exactSearch(results, query);
        break;
      case SEARCH_STRATEGIES.REGEX:
        results = regexSearch(results, query);
        break;
      case SEARCH_STRATEGIES.FUZZY:
      default:
        results = fuzzySearch(results, query);
        break;
    }
  }

  // Apply limit if specified
  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }

  return results;
};

// Export constants and helper functions
export const SearchStrategies = SEARCH_STRATEGIES;
export const ScoreThresholds = SCORE_THRESHOLDS;

// Search message content with highlighting
export const searchMessages = (messages, query) => {
  if (!query) return messages;

  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

  return messages.filter(message => {
    const content = message.content.toLowerCase();
    const sender = message.sender.name.toLowerCase();

    return searchTerms.every(term =>
      content.includes(term) || sender.includes(term)
    );
  }).map(message => ({
    ...message,
    highlightedContent: highlightSearchTerms(message.content, searchTerms)
  }));
};

// Highlight search terms in message content
const highlightSearchTerms = (content, searchTerms) => {
  let highlightedContent = content;
  searchTerms.forEach(term => {
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>');
  });
  return highlightedContent;
};

// Escape special characters for regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Filter messages by date range
export const filterByDateRange = (messages, startDate, endDate) => {
  if (!startDate && !endDate) return messages;

  const start = startDate ? new Date(startDate).getTime() : 0;
  const end = endDate ? new Date(endDate).getTime() : Infinity;

  return messages.filter(message => {
    const messageTime = new Date(message.timestamp).getTime();
    return messageTime >= start && messageTime <= end;
  });
};

// Filter messages by type
export const filterByType = (messages, types) => {
  if (!types || types.length === 0) return messages;
  return messages.filter(message => types.includes(message.type));
};

// Filter messages by sender
export const filterBySender = (messages, senderIds) => {
  if (!senderIds || senderIds.length === 0) return messages;
  return messages.filter(message => senderIds.includes(message.sender._id));
};

// Advanced search with multiple criteria
export const advancedSearch = (messages, {
  query = '',
  startDate = null,
  endDate = null,
  types = [],
  senderIds = [],
  hasAttachments = null,
  isUnread = null
}) => {
  let filteredMessages = [...messages];

  // Apply text search
  if (query) {
    filteredMessages = searchMessages(filteredMessages, query);
  }

  // Apply date range filter
  filteredMessages = filterByDateRange(filteredMessages, startDate, endDate);

  // Apply message type filter
  if (types.length > 0) {
    filteredMessages = filterByType(filteredMessages, types);
  }

  // Apply sender filter
  if (senderIds.length > 0) {
    filteredMessages = filterBySender(filteredMessages, senderIds);
  }

  // Filter by attachment presence
  if (hasAttachments !== null) {
    filteredMessages = filteredMessages.filter(message =>
      hasAttachments === Boolean(message.attachments?.length)
    );
  }

  // Filter by read status
  if (isUnread !== null) {
    filteredMessages = filteredMessages.filter(message =>
      isUnread === !message.readBy?.includes(currentUserId)
    );
  }

  return filteredMessages;
};

// Get message context (surrounding messages)
export const getMessageContext = (messages, messageId, contextSize = 3) => {
  const messageIndex = messages.findIndex(m => m._id === messageId);
  if (messageIndex === -1) return [];

  const start = Math.max(0, messageIndex - contextSize);
  const end = Math.min(messages.length, messageIndex + contextSize + 1);

  return messages.slice(start, end);
};

// Search message history statistics
export const getSearchStats = (messages, query) => {
  const matchedMessages = searchMessages(messages, query);

  return {
    totalMatches: matchedMessages.length,
    matchesByDate: groupMatchesByDate(matchedMessages),
    matchesBySender: groupMatchesBySender(matchedMessages),
    mostRelevantMessages: getMostRelevantMessages(matchedMessages, query)
  };
};

// Group matches by date for statistics
const groupMatchesByDate = (messages) => {
  const groups = {};
  messages.forEach(message => {
    const date = new Date(message.timestamp).toLocaleDateString();
    groups[date] = (groups[date] || 0) + 1;
  });
  return groups;
};

// Group matches by sender for statistics
const groupMatchesBySender = (messages) => {
  const groups = {};
  messages.forEach(message => {
    const senderId = message.sender._id;
    groups[senderId] = (groups[senderId] || 0) + 1;
  });
  return groups;
};

// Get most relevant messages based on query match count
const getMostRelevantMessages = (messages, query, limit = 5) => {
  const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);

  return messages
    .map(message => ({
      ...message,
      relevance: calculateRelevance(message, terms)
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
};

// Calculate message relevance score
const calculateRelevance = (message, searchTerms) => {
  const content = message.content.toLowerCase();
  let score = 0;

  searchTerms.forEach(term => {
    const matches = content.split(term).length - 1;
    score += matches;
  });

  return score;
};