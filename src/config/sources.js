// Default RSS feed sources organised by category
// Users can add/remove sources via settings
export const DEFAULT_SOURCES = {
  national: [
    { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', leaning: 'centre' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/uk/rss', leaning: 'centre-left' },
    { name: 'The Telegraph', url: 'https://www.telegraph.co.uk/rss.xml', leaning: 'centre-right' },
    { name: 'Reuters UK', url: 'https://www.reutersagency.com/feed/', leaning: 'centre' },
    { name: 'AP News', url: 'https://rsshub.app/apnews/topics/apf-topnews', leaning: 'centre' },
  ],
  international: [
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', leaning: 'centre' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', leaning: 'centre-left' },
    { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/', leaning: 'centre' },
    { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', leaning: 'centre-left' },
    { name: 'The Economist', url: 'https://www.economist.com/international/rss.xml', leaning: 'centre' },
  ],
  sport: [
    { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', leaning: 'centre' },
    { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', leaning: 'centre' },
    { name: 'The Guardian Sport', url: 'https://www.theguardian.com/uk/sport/rss', leaning: 'centre' },
  ],
  economy: [
    { name: 'Financial Times', url: 'https://www.ft.com/rss/home', leaning: 'centre-right' },
    { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', leaning: 'centre' },
    { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', leaning: 'centre' },
  ],
  technology: [
    { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', leaning: 'centre' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', leaning: 'centre' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', leaning: 'centre-left' },
  ],
  science: [
    { name: 'BBC Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', leaning: 'centre' },
    { name: 'Nature News', url: 'https://www.nature.com/nature.rss', leaning: 'centre' },
    { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', leaning: 'centre' },
  ],
  opinion: [
    { name: 'Guardian Opinion', url: 'https://www.theguardian.com/uk/commentisfree/rss', leaning: 'centre-left' },
    { name: 'The Spectator', url: 'https://www.spectator.co.uk/feed', leaning: 'right' },
    { name: 'New Statesman', url: 'https://www.newstatesman.com/feed', leaning: 'left' },
  ],
  travel: [
    { name: 'Guardian Travel', url: 'https://www.theguardian.com/uk/travel/rss', leaning: 'centre' },
    { name: 'Lonely Planet', url: 'https://www.lonelyplanet.com/news/feed', leaning: 'centre' },
  ],
  culture: [
    { name: 'Guardian Culture', url: 'https://www.theguardian.com/uk/culture/rss', leaning: 'centre-left' },
    { name: 'BBC Culture', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', leaning: 'centre' },
  ],
  local: [
    // Local feeds are region-specific; users should add their own
    { name: 'BBC England', url: 'https://feeds.bbci.co.uk/news/england/rss.xml', leaning: 'centre' },
  ],
};

// Political leaning spectrum for source weighting
export const LEANING_SPECTRUM = ['left', 'centre-left', 'centre', 'centre-right', 'right'];

// Calculate affinity score between user leaning and source leaning
// Returns 0.0 to 1.0 (1.0 = perfect match)
export function leaningAffinity(userLeaning, sourceLeaning) {
  const userIdx = LEANING_SPECTRUM.indexOf(userLeaning);
  const sourceIdx = LEANING_SPECTRUM.indexOf(sourceLeaning);
  if (userIdx === -1 || sourceIdx === -1) return 0.5;
  const distance = Math.abs(userIdx - sourceIdx);
  return 1 - distance * 0.2;
}
