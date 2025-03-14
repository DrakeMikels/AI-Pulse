// In a real application, this would interact with a database
// For now, we'll use a Set to store bookmarks in memory
let bookmarksSet = new Set<string>();

// Initialize a flag to track if we've loaded from localStorage
let hasInitialized = false;

// Function to initialize bookmarks from localStorage
const initializeFromLocalStorage = () => {
  if (typeof window !== 'undefined' && !hasInitialized) {
    try {
      const savedBookmarks = localStorage.getItem('bookmarks');
      if (savedBookmarks) {
        bookmarksSet = new Set(JSON.parse(savedBookmarks));
      }
      hasInitialized = true;
    } catch (error) {
      console.error('Error loading bookmarks from localStorage:', error);
    }
  }
};

// Export a bookmarks object with methods to manipulate the set
export const bookmarks = {
  add: (id: string) => {
    // Ensure we've loaded from localStorage first
    initializeFromLocalStorage();
    
    bookmarksSet.add(id);
    // Save to localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarksSet)));
    }
  },
  
  delete: (id: string) => {
    // Ensure we've loaded from localStorage first
    initializeFromLocalStorage();
    
    bookmarksSet.delete(id);
    // Save to localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarksSet)));
    }
  },
  
  has: (id: string) => {
    // Ensure we've loaded from localStorage first
    initializeFromLocalStorage();
    return bookmarksSet.has(id);
  },
  
  getAll: () => {
    // Ensure we've loaded from localStorage first
    initializeFromLocalStorage();
    return Array.from(bookmarksSet);
  },
  
  clear: () => {
    // Ensure we've loaded from localStorage first
    initializeFromLocalStorage();
    
    bookmarksSet.clear();
    // Save to localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookmarks', JSON.stringify([]));
    }
  }
}; 