/**
 * Supabase Database Types
 * Permissive schema - allows all tables/columns without strict typing.
 * Replace with generated types via:
 *   npx supabase gen types typescript --project-id mjuaefipdzxfqazzbyke > src/types/supabase.ts
 */

type AnyRow = Record<string, any>;

export type Database = {
  public: {
    Tables: {
      [tableName: string]: {
        Row: AnyRow;
        Insert: AnyRow;
        Update: AnyRow;
        Relationships: [];
      };
    };
    Views: {
      [viewName: string]: {
        Row: AnyRow;
      };
    };
    Functions: {
      [funcName: string]: {
        Args: AnyRow;
        Returns: any;
      };
    };
    Enums: {
      [enumName: string]: string;
    };
  };
};
