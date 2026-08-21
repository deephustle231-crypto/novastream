export interface QualityOption {
  resolution: string;
  url: string;
}

export interface StreamSource {
  name: string;
  url: string;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  quality: string;
  genre: string;
  poster: string;
  synopsis: string;
  sources: StreamSource[];
  qualities: QualityOption[];
}

export const CATALOGUE_DATA: Movie[] = [
  {
    id: 'embed_night_living_dead',
    title: 'Night of the Living Dead',
    year: 1968,
    duration: '1h 36m',
    quality: '1080p HD',
    genre: 'Horror / Classic',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Night_of_the_Living_Dead_poster.jpg',
    synopsis: 'A group of people barricade themselves inside a rural farmhouse to survive a horde of flesh-eating ghouls.',
    sources: [
      {
        name: 'Server 1 (Archive Embed)',
        url: 'https://archive.org/embed/night_of_the_living_dead'
      }
    ],
    qualities: [
      {
        resolution: '1080p',
        url: 'https://archive.org/embed/night_of_the_living_dead'
      }
    ]
  },
  {
    id: 'embed_charade',
    title: 'Charade',
    year: 1963,
    duration: '1h 53m',
    quality: '1080p HD',
    genre: 'Mystery / Romance',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Charade_poster.jpg',
    synopsis: 'A young widow in Paris is pursued by several men who want a fortune her murdered husband had stolen.',
    sources: [
      {
        name: 'Server 1 (Archive Embed)',
        url: 'https://archive.org/embed/Charade1963'
      }
    ],
    qualities: [
      {
        resolution: '1080p',
        url: 'https://archive.org/embed/Charade1963'
      }
    ]
  },
  {
    id: 'embed_house_haunted_hill',
    title: 'House on Haunted Hill',
    year: 1959,
    duration: '1h 15m',
    quality: '720p HQ',
    genre: 'Horror / Thriller',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/8/82/House_on_Haunted_Hill_poster.jpg',
    synopsis: 'An eccentric millionaire offers $10,000 to five guests if they can survive a night locked in a haunted house.',
    sources: [
      {
        name: 'Server 1 (Archive Embed)',
        url: 'https://archive.org/embed/house_on_haunted_hill_1959'
      }
    ],
    qualities: [
      {
        resolution: '720p',
        url: 'https://archive.org/embed/house_on_haunted_hill_1959'
      }
    ]
  }
];
