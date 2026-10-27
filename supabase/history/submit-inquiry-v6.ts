
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const origins = new Set([
  "https://lexexpressllc.com",
  "https://www.lexexpressllc.com",
  "https://lexexpress612.github.io",
  "https://lexexpress-github-io.lexexpress612.workers.dev",
]);

const services = new Set([
  "Air Cargo & Airport Logistics",
  "Medical & Healthcare Logistics",
  "Specialized Freight",
  "Catering (Optional Add-On)",
  "Other / Not Sure",
]);

const AIRTABLE_BASE = "appXPWY7OqQTmdZNd";
const AIRTABLE_TABLE = "tblz3RMTv0QuUgDZC";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": origins.has(origin)
      ? origin
      : "https://lexexpressllc.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, apikey, authorization",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };

  const respond = (data: object, status: number) =>
    new Response(JSON.stringify(data), { status, headers });

  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });

  if (req.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);

  if (!origins.has(origin))
    return respond({ error: "Origin not allowed" }, 403);

  if (Number(req.headers.get("content-length") || 0) > 12000)
    return respond({ error: "Request too large" }, 413);

  try {
    const b = await req.json();

    if (typeof b.website === "string" && b.website.trim())
      return respond({ ok: true }, 200);

    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim();
    const phone = String(b.phone || "").trim();
    const service = String(b.service || "").trim();
    const details = String(b.details || "").trim();

    if (
      name.length < 2 ||
      name.length > 160 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.length < 5 ||
      phone.length > 50 ||
      !services.has(service) ||
      details.length < 10 ||
      details.length > 4000
    ) {
      return respond(
        { error: "Please check all required fields." },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase
      .from("customer_inquiries")
      .insert({
        customer_name: name,
        email,
        phone,
        service_type: service,
        details,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Inquiry insert failed", error.code);
      return respond(
        { error: "Could not save inquiry. Please try again." },
        500
      );
    }

    // Supabase is the primary record.
    // Airtable receives a copy for the email automation.
    const token = Deno.env.get("AIRTABLE_PAT");

    if (!token) {
      console.error("AIRTABLE_PAT secret is missing");
    } else {
      try {
        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              records: [
                {
                  fields: {
                    "Customer Name": name,
                    "Email Address": email,
                    "Phone Number": phone,
                    "Service Type": "Other",
                    "Website Service Requested": service,
                    "Inquiry Details": `Requested service: ${service}\n\n${details}`,
                  },
                },
              ],
              typecast: false,
            }),
          }
        );

        if (!airtableResponse.ok) {
          console.error(
            "Airtable synchronization failed",
            airtableResponse.status,
            "Supabase inquiry:",
            data.id
          );
        } else {
          console.log(
            "Airtable synchronization succeeded",
            data.id
          );
        }
      } catch (err) {
        console.error(
          "Airtable connection error",
          String(err),
          "Supabase inquiry:",
          data.id
        );
      }
    }

    return respond(
      {
        ok: true,
        message: "Your inquiry has been received.",
      },
      201
    );
  } catch (err) {
    console.error("Request processing failed", String(err));
    return respond({ error: "Invalid request" }, 400);
  }
});

