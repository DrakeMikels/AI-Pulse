import requests
from bs4 import BeautifulSoup
import json
import os
import time
from datetime import datetime, timedelta
import uuid
from dotenv import load_dotenv
import xml.etree.ElementTree as ET

# Load environment variables
load_dotenv()

# Sources to scrape
SOURCES = {
    "Anthropic": {
        "url": "https://www.anthropic.com/news",
        "type": "html",
        "selector": "li, article",
        "title_selector": "h3, h2",
        "link_selector": "a",
        "base_url": "https://www.anthropic.com"
    },
    "Google AI": {
        "url": "https://blog.google/technology/ai/",
        "type": "html",
        "selector": "article",
        "title_selector": "h3, h2",
        "link_selector": "a",
        "base_url": "https://blog.google"
    },
    "Wired AI": {
        "url": "https://www.wired.com/feed/tag/ai/latest/rss",
        "type": "rss",
        "base_url": "https://www.wired.com"
    },
    "AI Blog": {
        "url": "https://www.artificial-intelligence.blog/ai-news?format=rss",
        "type": "rss",
        "base_url": "https://www.artificial-intelligence.blog"
    }
}

def scrape_rss(url, source_name):
    """Scrape articles from an RSS feed"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        
        print(f"RSS feed status code: {response.status_code}")
        
        # Debug: Print the first 500 characters of the response
        print(f"RSS feed content preview: {response.text[:500]}")
        
        # Parse the XML
        root = ET.fromstring(response.content)
        
        # Find all items (articles)
        articles = []
        
        # RSS namespace handling
        namespaces = {'content': 'http://purl.org/rss/1.0/modules/content/'}
        
        # Find all items in the RSS feed
        for item in root.findall('.//item'):
            title = item.find('title').text if item.find('title') is not None else ""
            link = item.find('link').text if item.find('link') is not None else ""
            description = item.find('description').text if item.find('description') is not None else ""
            pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
            
            # Try to get content if available
            content = ""
            content_encoded = item.find('.//content:encoded', namespaces)
            if content_encoded is not None and content_encoded.text:
                content = content_encoded.text
            
            # Create a simple article object
            article_obj = {
                "title": title,
                "link": link,
                "description": description,
                "content": content,
                "pub_date": pub_date
            }
            
            articles.append(article_obj)
        
        print(f"Found {len(articles)} articles in RSS feed")
        return articles[:5]  # Return the 5 most recent articles
        
    except Exception as e:
        print(f"Error scraping RSS feed {url}: {e}")
        print(f"Response content: {response.text[:200]}")
        return []

def scrape_article(url, source):
    """Scrape an individual article page"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract article content (this will vary by site)
        # This is a simplified example
        content = ""
        article_body = soup.find('article') or soup.find('main')
        
        if article_body:
            paragraphs = article_body.find_all('p')
            content = ' '.join([p.text for p in paragraphs])
        
        # Extract image if available
        image_url = None
        main_image = soup.find('meta', property='og:image')
        if main_image:
            image_url = main_image.get('content')
        
        return {
            "content": content,
            "imageUrl": image_url
        }
    except Exception as e:
        print(f"Error scraping article {url}: {e}")
        return {"content": "", "imageUrl": None}

def generate_simple_summary(content, title, max_length=150):
    """Generate a simple summary without using OpenAI API"""
    if not content or len(content) < 20:
        return f"This is an article about {title}."
    
    # Simple extractive summary - take the first few sentences
    sentences = content.split('.')
    summary = '.'.join(sentences[:3]) + '.'
    
    # Truncate if too long
    if len(summary) > max_length:
        summary = summary[:max_length] + '...'
    
    return summary

def extract_simple_topics(content, title):
    """Extract simple topics without using OpenAI API"""
    # Default topics based on the source
    default_topics = ["AI", "Technology", "Machine Learning"]
    
    # Simple keyword-based topic extraction
    keywords = {
        "GPT": "GPT",
        "Claude": "Claude",
        "Gemini": "Gemini",
        "LLM": "LLM",
        "language model": "LLM",
        "multimodal": "Multimodal AI",
        "vision": "Computer Vision",
        "image": "Computer Vision",
        "code": "Coding",
        "programming": "Coding",
        "safety": "AI Safety",
        "alignment": "AI Alignment",
        "regulation": "AI Regulation",
        "policy": "AI Policy",
        "open source": "Open Source",
        "research": "Research"
    }
    
    found_topics = set()
    
    # Check title and content for keywords
    text_to_check = (title + " " + content[:1000]).lower()
    
    for keyword, topic in keywords.items():
        if keyword.lower() in text_to_check:
            found_topics.add(topic)
    
    # Return found topics or default topics if none found
    topics_list = list(found_topics)
    if len(topics_list) < 3:
        topics_list.extend(default_topics)
    
    return topics_list[:3]  # Return at most 3 topics

def scrape_sources():
    """Scrape all configured sources"""
    all_articles = []
    
    for source_name, config in SOURCES.items():
        print(f"Scraping {source_name}...")
        
        if config["type"] == "rss":
            # Handle RSS feed
            rss_articles = scrape_rss(config["url"], source_name)
            
            for i, rss_article in enumerate(rss_articles):
                try:
                    title = rss_article["title"]
                    link = rss_article["link"]
                    
                    print(f"Found article: {title}")
                    
                    # Use the description as content or scrape the full article
                    content = rss_article["content"] or rss_article["description"]
                    
                    # If content is still empty, try to scrape the article
                    if not content:
                        article_data = scrape_article(link, source_name)
                        content = article_data["content"]
                        image_url = article_data["imageUrl"]
                    else:
                        # Try to extract image from content using BeautifulSoup
                        image_url = None
                        soup = BeautifulSoup(content, 'html.parser')
                        img_tag = soup.find('img')
                        if img_tag and img_tag.get('src'):
                            image_url = img_tag.get('src')
                    
                    # Generate summary and topics
                    summary = generate_simple_summary(content, title)
                    topics = extract_simple_topics(content, title)
                    
                    # Create article object
                    article_obj = {
                        "id": str(uuid.uuid4()),
                        "title": title,
                        "summary": summary,
                        "content": content[:1000] + "..." if content else "Content unavailable.",
                        "url": link,
                        "imageUrl": image_url,
                        "source": source_name,
                        "topics": topics,
                        "publishedAt": (datetime.now() - timedelta(hours=i)).isoformat(),
                        "createdAt": datetime.now().isoformat()
                    }
                    
                    all_articles.append(article_obj)
                    
                    # Be nice to the servers
                    time.sleep(1)
                    
                except Exception as e:
                    print(f"Error processing RSS article: {e}")
                    continue
        else:
            # Handle HTML scraping
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = requests.get(config["url"], headers=headers)
                
                print(f"HTML scraping status code: {response.status_code}")
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                articles = soup.select(config["selector"])
                print(f"Found {len(articles)} article elements")
                
                article_count = 0
                for article in articles:
                    if article_count >= 5:  # Limit to 5 most recent articles per source
                        break
                        
                    try:
                        title_elem = article.select_one(config["title_selector"])
                        if not title_elem:
                            continue
                            
                        title = title_elem.text.strip()
                        if not title or title == "No results found.":
                            continue
                            
                        link_elem = article.select_one(config["link_selector"])
                        if not link_elem:
                            continue
                            
                        link = link_elem.get('href')
                        if not link:
                            continue
                        
                        # Handle relative URLs
                        if link.startswith('/'):
                            link = config["base_url"] + link
                        
                        print(f"Found article: {title}")
                        
                        # Scrape the full article
                        article_data = scrape_article(link, source_name)
                        
                        # Generate summary and topics
                        summary = generate_simple_summary(article_data["content"], title)
                        topics = extract_simple_topics(article_data["content"], title)
                        
                        # Create article object
                        article_obj = {
                            "id": str(uuid.uuid4()),
                            "title": title,
                            "summary": summary,
                            "content": article_data["content"][:1000] + "..." if article_data["content"] else "Content unavailable.",
                            "url": link,
                            "imageUrl": article_data["imageUrl"],
                            "source": source_name,
                            "topics": topics,
                            "publishedAt": (datetime.now() - timedelta(hours=article_count)).isoformat(),
                            "createdAt": datetime.now().isoformat()
                        }
                        
                        all_articles.append(article_obj)
                        article_count += 1
                        
                        # Be nice to the servers
                        time.sleep(1)
                        
                    except Exception as e:
                        print(f"Error processing article: {e}")
                        continue
                        
            except Exception as e:
                print(f"Error scraping {source_name}: {e}")
                continue
    
    # Save to JSON file
    with open('data/articles.json', 'w') as f:
        json.dump(all_articles, f, indent=2)
    
    print(f"Scraped {len(all_articles)} articles in total")
    return all_articles

if __name__ == "__main__":
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Run the scraper
    scrape_sources()

