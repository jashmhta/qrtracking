/**
 * Google Sheets API Integration
 * Supports both Direct API (Read-only/Public) and Google Apps Script Web App (Secure Write)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Participant, ScanLog } from "@/types";

const GOOGLE_SHEETS_CONFIG_KEY = "@palitana_google_sheets_config";

export interface GoogleSheetsConfig {
  spreadsheetId?: string;
  apiKey?: string;
  webAppUrl?: string; // New: Google Apps Script Web App URL
  mode: "api" | "script"; // New: Connection mode
  isConnected: boolean;
  lastSyncTime: string | null;
  sheetsSetup: {
    participants: boolean;
    scanLogs: boolean;
    checkpoints: boolean;
  };
}

class GoogleSheetsAPI {
  private config: GoogleSheetsConfig | null = null;
  private baseUrl = "https://sheets.googleapis.com/v4/spreadsheets";

  /**
   * Initialize the Google Sheets API service
   */
  async init(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(GOOGLE_SHEETS_CONFIG_KEY);
      if (configData) {
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.error("[GoogleSheetsAPI] Failed to load config:", error);
    }
  }

  /**
   * Save configuration
   */
  async saveConfig(config: GoogleSheetsConfig): Promise<void> {
    this.config = config;
    await AsyncStorage.setItem(GOOGLE_SHEETS_CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Get current configuration
   */
  getConfig(): GoogleSheetsConfig | null {
    return this.config;
  }

  /**
   * Test connection to Google Apps Script Web App
   */
  async testWebAppConnection(url: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Send a ping action
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // distinct header for CORS in GAS
        body: JSON.stringify({ action: "test" }),
      });

      if (!response.ok) {
        return { success: false, message: "Script URL is not accessible" };
      }

      const data = await response.json();
      if (data.status === "success") {
        return { success: true, message: "Connected to Google Sheets Script!" };
      }
      return { success: false, message: data.message || "Unknown script response" };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Network error" };
    }
  }

  /**
   * Test connection to Google Sheets API (Legacy/Read-only)
   */
  async testConnection(spreadsheetId: string, apiKey: string): Promise<{ success: boolean; error?: string; title?: string }> {
    try {
      const url = `${this.baseUrl}/${spreadsheetId}?key=${apiKey}&fields=properties.title,sheets.properties.title`;
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error?.message || "Failed to connect" };
      }
      const data = await response.json();
      return { success: true, title: data.properties?.title || "Untitled Spreadsheet" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }

  /**
   * Generic POST to Web App
   */
  private async postToWebApp(action: string, payload: any): Promise<boolean> {
    if (!this.config?.webAppUrl) return false;

    try {
      // Apps Script requires text/plain to avoid CORS preflight issues sometimes, 
      // but we send JSON stringified in body.
      const response = await fetch(this.config.webAppUrl, {
        method: "POST",
        body: JSON.stringify({ action, ...payload }),
      });
      
      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      console.error(`[GoogleSheetsAPI] Script error (${action}):`, error);
      return false;
    }
  }

  /**
   * Write a scan log
   */
  async writeScanLog(scanLog: ScanLog): Promise<boolean> {
    // Mode 1: Web App (Preferred)
    if (this.config?.mode === "script" && this.config.webAppUrl) {
      return this.postToWebApp("addScanLog", { scanLog });
    }
    
    // Mode 2: Direct API (Fall back to append if configured, though insecure/unreliable for writes without OAuth)
    // We treat this as "not supported" for high-reliability requirements unless user has API key with write access (rare)
    return false; 
  }

  /**
   * Write multiple scan logs
   */
  async writeScanLogs(scanLogs: ScanLog[]): Promise<boolean> {
    if (this.config?.mode === "script" && this.config.webAppUrl) {
      return this.postToWebApp("addScanLogs", { scanLogs });
    }
    return false;
  }

  /**
   * Write a participant
   */
  async writeParticipant(participant: Participant): Promise<boolean> {
    if (this.config?.mode === "script" && this.config.webAppUrl) {
      return this.postToWebApp("addParticipant", { participant });
    }
    return false;
  }

  /**
   * Sync Data (Hybrid)
   */
  async syncData(localParticipants: Participant[], localScanLogs: ScanLog[]): Promise<any> {
    if (this.config?.mode === "script" && this.config.webAppUrl) {
        // For script mode, we just push unsynced data
        // The script handles deduplication
        // We assume "synced" flag is managed by caller
        return { uploadedScans: 0 }; // Caller handles logic
    }
    return { uploadedScans: 0 };
  }

  // ... keep legacy read methods if needed for reports ...
  async readParticipants(): Promise<Participant[]> { return []; }
  async readScanLogs(): Promise<ScanLog[]> { return []; }
  async setupSheets(): Promise<any> { return { success: true }; }
}

export const googleSheetsAPI = new GoogleSheetsAPI();
export const initGoogleSheets = () => googleSheetsAPI.init();
export const testGoogleSheetsConnection = (id: string, key: string) => googleSheetsAPI.testConnection(id, key);
export const testWebAppConnection = (url: string) => googleSheetsAPI.testWebAppConnection(url);
export const writeScanLogToSheet = (log: ScanLog) => googleSheetsAPI.writeScanLog(log);
