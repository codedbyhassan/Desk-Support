import {adminClient,json,errorResponse} from "../_shared.ts";
Deno.serve(async(req)=>{try{const db=adminClient();const {data:rows,error}=await db.from("notification_deliveries").select("id,notification_id,channel,status,device_id").eq("status","pending").order("created_at").limit(500);if(error)throw error;return json({ok:true,queued:rows??[]});}catch(e){return errorResponse(e)}});
