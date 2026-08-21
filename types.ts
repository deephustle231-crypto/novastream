// NovaStream Data Types and Interfaces

export type RightsStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' | 'UNKNOWN';

export type MediaValidationStatus = 'VALID' | 'INVALID' | 'UNAVAILABLE' | 'PENDING' | 'NEEDS_REVIEW';

export type AvailabilityStatus = 'active' | 'disabled';

export type MediaType = 'movie' | 'series' | 'episode';

export type UserRole = 'user' | 'admin';

export type PlanTier = 'free' | 'premium';

export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'expired' | 'past_due';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  role: UserRole;
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface MovieStream {
  name: string;
  url: string;
}

export type SourceMirror = MovieStream;

export interface QualityOption {
  resolution: string; // e.g. "1080p (HD)", "720p (HD)", "480p (SD)", "360p (Low)"
  url: string;
}

export interface TrailerItem {
  id: string;
  title: string;
  type: 'Official Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Restored Preview';
  duration?: string;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  publishDate?: string;
  quality?: string;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  quality?: string;
  genre: string;
  genres?: string[];
  poster: string;
  synopsis?: string;
  description?: string;
  sources: MovieStream[];
  qualities: { resolution: string; url: string }[];
  runtime?: number; // in minutes
  type?: 'movie';
  backdrop?: string;
  rating?: string; // e.g. "PG-13", "TV-14", "8.4"
  cast?: string[];
  actorPhotos?: { name: string; avatar: string }[];
  animatedCover?: string;
  animated_poster_url?: string;
  director?: string;
  videoUrl?: string;
  trailerUrl?: string;
  trailers?: TrailerItem[];
  primaryVerifiedSource?: string;
  fallbackVerifiedSources?: string[];
  fallbackSources?: string[];
  subtitleUrl?: string;
  source?: string; // e.g. "Internet Archive", "Blender Foundation", "Creative Commons"
  licenceInfo?: string; // e.g. "Public Domain", "Creative Commons BY 3.0", "Open Source"
  rightsStatus?: RightsStatus;
  mediaValidationStatus?: MediaValidationStatus;
  playbackStatus?: 'VERIFIED' | 'FAILED' | 'UNAVAILABLE' | 'PENDING' | 'REQUIRES_REVIEW';
  seekStatus?: 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';
  mimeType?: string;
  failureReason?: string;
  validated?: boolean;
  availabilityStatus?: AvailabilityStatus;
  internetArchiveId?: string;
  isFeatured?: boolean;
  isPremiumOnly?: boolean;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  duration?: string;
  description: string;
  runtime: number; // in minutes
  videoUrl: string;
  sources: SourceMirror[];
  qualities?: QualityOption[];
  primaryVerifiedSource?: string;
  fallbackVerifiedSources?: string[];
  fallbackSources?: string[];
  subtitleUrl?: string;
  thumbnail: string;
  animated_poster_url?: string;
  mediaValidationStatus: MediaValidationStatus;
  playbackStatus?: 'VERIFIED' | 'FAILED' | 'UNAVAILABLE' | 'PENDING' | 'REQUIRES_REVIEW';
  seekStatus?: 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';
  mimeType?: string;
  failureReason?: string;
  validated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Season {
  seasonNumber: number;
  title: string;
  description?: string;
  episodes: Episode[];
}

export interface Series {
  id: string;
  title: string;
  year: number;
  genre?: string;
  genres: string[];
  type?: 'series';
  description: string;
  poster: string;
  backdrop: string;
  animated_poster_url?: string;
  animatedCover?: string;
  trailerUrl?: string;
  trailers?: TrailerItem[];
  rating: string;
  cast: string[];
  director: string;
  source: string;
  licenceInfo: string;
  rightsStatus: RightsStatus;
  mediaValidationStatus: MediaValidationStatus;
  availabilityStatus: AvailabilityStatus;
  seasons: Season[];
  isFeatured?: boolean;
  isPremiumOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WatchProgress {
  id: string;
  userId: string;
  mediaId: string;
  mediaType: 'movie' | 'episode';
  seriesId?: string;
  episodeId?: string;
  title: string;
  poster: string;
  positionSeconds: number;
  durationSeconds: number;
  completionPercentage: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  mediaId: string;
  mediaType: 'movie' | 'series';
  title: string;
  poster: string;
  backdrop?: string;
  year: number;
  rating: string;
  genres: string[];
  createdAt: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  code: string;
  amount: number; // in NGN (e.g. 2500)
  currency: string; // "NGN"
  interval: 'monthly' | 'annually';
  description: string;
  features: string[];
  active: boolean;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  reference: string;
  transactionId?: string;
  amount: number; // in NGN
  currency: string;
  plan: string;
  status: 'success' | 'failed' | 'pending';
  paymentDate: string;
  channel?: string;
  rawMetadata?: any;
  createdAt: string;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userEmail: string;
  plan: string;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  reference: string;
  paystackSubscriptionCode?: string;
  startDate: string;
  nextBillingDate?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaValidationResult {
  id: string;
  mediaId: string;
  movieId?: string;
  mediaType: 'movie' | 'episode';
  mediaTitle: string;
  url: string;
  source?: string;
  sourceIdentifier?: string;
  format?: string;
  status: MediaValidationStatus;
  playbackStatus?: 'VERIFIED' | 'FAILED' | 'UNAVAILABLE' | 'PENDING' | 'REQUIRES_REVIEW';
  seekStatus?: 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';
  httpStatusCode?: number;
  mimeType?: string;
  acceptRanges?: boolean;
  canSeek?: boolean;
  subtitleAvailable?: boolean;
  subtitleUrl?: string;
  latencyMs?: number;
  errorMessage?: string;
  failureReason?: string;
  checkedAt: string;
  lastChecked?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface PlaybackErrorLog {
  id: string;
  userId?: string;
  userEmail?: string;
  mediaId: string;
  mediaTitle: string;
  videoUrl: string;
  errorName: string;
  errorMessage: string;
  playbackTime?: number;
  userAgent?: string;
  reportedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment' | 'subscription' | 'system' | 'release' | 'warning';
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
}

export interface AdminSettings {
  maintenanceMode: boolean;
  allowedSignups: boolean;
  paystackConfigured: boolean;
  paystackPublicKey: string;
  googleSheetsConfigured: boolean;
  googleSheetsSpreadsheetId?: string;
  autoValidationEnabled: boolean;
  lastUpdated: string;
}

export interface UserFeedbackRating {
  id?: string;
  mediaId: string;
  userId: string;
  score: number; // 1 to 5
  updatedAt: string;
}

export interface MediaRatingSummary {
  mediaId: string;
  averageRating: number;
  totalRatings: number;
  userRating?: number;
}

export type Watchlist = WatchlistItem;
export type ValidationLog = MediaValidationResult;
export type AuditLog = AuditLogEntry;

export interface InternetArchiveSearchResult {
  identifier: string;
  title: string;
  year?: number;
  description?: string;
  licenseurl?: string;
  rights?: string;
  creator?: string;
  runtime?: string;
  videoFileUrl?: string;
  posterUrl?: string;
  subtitleUrl?: string;
  format?: string;
  itemSize?: number;
  rightsStatus: RightsStatus;
  validationStatus: MediaValidationStatus;
}
