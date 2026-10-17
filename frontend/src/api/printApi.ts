/**
 * The Print cards / Print bucket screens are shared by the staff app and
 * the member portal. They only differ in which endpoints they call (and
 * whether a download costs credits), so each screen takes one of these
 * adapter objects instead of importing the staff API directly.
 */
import { listCardTypes } from "./cardTypes";
import { getCardImageUrl } from "./cards";
import { addToBucket, listBucket, printBucketSheet, removeFromBucket } from "./printBucket";
import {
  createUploadedCard,
  createUploadedCardFromLetter,
  deleteUploadedCard,
  getUploadedCardImageUrl,
  listUploadedCards,
  previewUploadedCardSheet,
  printUploadedCardSheet,
} from "./uploadedCards";
import type { CardType } from "@/types/cardType";
import type { PrintBucketItem } from "@/types/printBucket";
import type { PrintSheetItem, UploadedCard } from "@/types/uploadedCard";

/** An error whose message came from the server and is fit to show as-is. */
export class ApiMessageError extends Error {
  constructor(message: string, public reasonCode?: string) {
    super(message);
    this.name = "ApiMessageError";
  }
}

export interface PrintCardsApi {
  listCardTypes: () => Promise<CardType[]>;
  listUploadedCards: () => Promise<UploadedCard[]>;
  createUploadedCard: (cardTypeId: string, name: string, front: File, back?: File | null) => Promise<UploadedCard>;
  createUploadedCardFromLetter: (cardTypeId: string, name: string, letter: File, password?: string) => Promise<UploadedCard>;
  deleteUploadedCard: (id: string) => Promise<void>;
  getUploadedCardImageUrl: (id: string, side?: "front" | "back") => Promise<string>;
  previewUploadedCardSheet: (items: PrintSheetItem[], paperSize?: string) => Promise<string[]>;
  printUploadedCardSheet: (items: PrintSheetItem[], paperSize?: string) => Promise<void>;
}

export interface PrintBucketApi {
  listBucket: () => Promise<PrintBucketItem[]>;
  removeFromBucket: (itemId: string) => Promise<void>;
  printBucketSheet: (itemIds: string[], paperSize?: string) => Promise<void>;
  getCardImageUrl: (generatedCardId: string, side?: "front" | "back") => Promise<string>;
  addToBucket?: (generatedCardId: string) => Promise<PrintBucketItem>;
}

export const staffPrintCardsApi: PrintCardsApi = {
  listCardTypes,
  listUploadedCards: () => listUploadedCards(),
  createUploadedCard,
  createUploadedCardFromLetter,
  deleteUploadedCard,
  getUploadedCardImageUrl,
  previewUploadedCardSheet,
  printUploadedCardSheet,
};

export const staffPrintBucketApi: PrintBucketApi = {
  listBucket,
  removeFromBucket,
  printBucketSheet,
  getCardImageUrl,
  addToBucket,
};
