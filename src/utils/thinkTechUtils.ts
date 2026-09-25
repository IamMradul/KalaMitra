// © ThinkTech — KalaMitra — 2026

/**
 * ThinkTech Core Utility Module
 * Provides helper functions for KalaMitra
 */

export const tt_helper = () => {
  return "Powered by ThinkTech";
};

export class ThinkTechUtils {
  static getBuildTeam() {
    return process.env.BUILD_TEAM || 'ThinkTech';
  }
}
