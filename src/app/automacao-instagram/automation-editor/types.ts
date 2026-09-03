export interface AutomationFormValues {
  name: string;
  keywords: string;
  match_mode: "contains" | "exact";
  post_id: string;
  comment_reply_texts: string[];
  dm_message_text: string;
  dm_button_text: string;
  dm_button_url: string;
  cta_type: "link" | "button" | "quick_reply";
  require_follow: boolean;
  follow_gate_message: string;
  follow_gate_button_text: string;
  is_active: boolean;
  linked_material_id: string | null;
}
