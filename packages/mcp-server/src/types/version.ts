/**
 * Types for semantic versioning and release management.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export interface ReleaseEntry {
  tag: string;
  date: string;
  description: string;
  snapshot: Record<string, string>; // doc_type → version
  notes_file?: string;
}

export interface ReleasesFile {
  format: "semver";
  current: Record<string, string>; // doc_type → version
  releases: ReleaseEntry[];
}

export interface VersionQueryResult {
  versions: Record<string, { tracked: string; actual: string; match: boolean }>;
  mismatches: string[];
}

export interface ReleaseResult {
  tag: string;
  snapshot: Record<string, string>;
  notes_file: string;
  git_tagged: boolean;
}
