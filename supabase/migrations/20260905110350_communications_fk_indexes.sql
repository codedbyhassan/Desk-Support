create index if not exists calls_company_idx on public.calls(company_id);
create index if not exists conversations_created_by_idx on public.conversations(created_by);
create index if not exists messages_reply_to_idx on public.messages(reply_to_id);
create index if not exists conversation_reactions_user_idx on public.conversation_message_reactions(user_id);
create index if not exists message_read_receipts_user_idx on public.message_read_receipts(user_id);
