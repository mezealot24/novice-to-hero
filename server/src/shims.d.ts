// src/save.ts is only type-imported by data/*; this keeps the typecheck quiet without DOM libs.
declare const localStorage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
