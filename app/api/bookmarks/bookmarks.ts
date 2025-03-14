// In a real application, this would interact with a database
// For now, we'll use a Set to store bookmarks in memory
let bookmarksSet = new Set<string>();

// Try to load bookmarks from localStorage on the client side
if (typeof window !== 'undefined') {
  try {
    const savedBookmarks = localStorage.getItem('bookmarks');
    if (savedBookmarks) {
      bookmarksSet = new Set(JSON.parse(savedBookmarks));
    }
  } catch (error) {
    console.error('Error loading bookmarks from localStorage:', error);
  }
}

// Export a bookmarks object with methods to manipulate the set
export const bookmarks = {
  add: (id: string) => {
    bookmarksSet.add(id);
    // Save to localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarksSet)));
    }
  },
  
  delete: (id: string) => {
    bookmarksSet.delete(id);
    // Save to localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarksSet)));
    }
  },
  
  has: (id: string) => bookmarksSet.has(id),
  
  getAll: () => Array.from(bookmarksSet),
  
  clear: () => {
    bookmarksSet.clear();
    // Save to localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookmarks', JSON.stringify([]));
    }
  }
}; 