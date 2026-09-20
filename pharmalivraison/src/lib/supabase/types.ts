/**
 * Types de la base de donnees.
 *
 * Ce fichier est un substitut permissif : il permet de typer les clients des
 * l'etape 1, avant que le schema n'existe. A l'etape 2, une fois les tables
 * creees, il sera remplace par les types generes :
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TablePlaceholder = {
  Row: Record<string, Json | undefined>;
  Insert: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: Record<string, TablePlaceholder>;
    Views: Record<string, TablePlaceholder>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
