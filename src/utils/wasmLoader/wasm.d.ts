import { GoFuncs } from "./goFuncs";

declare global {
  export interface Window extends GoFuncs {
    Go: any;
  }
}

export {};
