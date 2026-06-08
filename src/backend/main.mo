import Time "mo:core/Time";
import Text "mo:core/Text";
import Prim "mo:⛔";

actor {
  // ── IC Management canister (for HTTP outcalls) ──────────────────────────
  type HttpHeader = { name : Text; value : Text };
  type HttpRequestResult = { status : Nat; headers : [HttpHeader]; body : Blob };
  type HttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    method : { #get; #head; #post };
    headers : [HttpHeader];
    body : ?Blob;
    transform : ?{
      function : shared ({ response : HttpRequestResult; context : Blob }) -> async HttpRequestResult;
      context : Blob;
    };
    is_replicated : ?Bool;
  };

  let IC = actor "aaaaa-aa" : actor {
    http_request : HttpRequestArgs -> async HttpRequestResult;
  };

  // ── Cache state ──────────────────────────────────────────────────────────
  let SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6Tagvf-iWDfJkpi8x9lMRFfhbcZ1kLz4oQFtXaGdsEwiEPv8gABnbhEAdTmVfMhkJHPj5DekJ2rsG/pub?gid=0&single=true&output=csv";
  let CACHE_TTL_NS : Int = 5 * 60 * 1_000_000_000; // 5 minutes in nanoseconds

  var cachedCsv : Text = "";
  var cacheTimestamp : Int = 0;

  // ── Transform function (required for IC HTTP consensus) ──────────────────
  // Strips response headers so all nodes agree on the same response body.
  public shared func transform(raw : { response : HttpRequestResult; context : Blob }) : async HttpRequestResult {
    {
      status = raw.response.status;
      headers = [];
      body = raw.response.body;
    };
  };

  // ── Public API ───────────────────────────────────────────────────────────
  public func fetchSheetData() : async { #ok : Text; #err : Text } {
    let now = Time.now();
    // Return cached value if still fresh
    if (cachedCsv != "" and (now - cacheTimestamp) < CACHE_TTL_NS) {
      return #ok(cachedCsv);
    };

    // Helper: make an HTTP GET outcall; optionally apply the transform function
    let makeRequest = func(url : Text, applyTransform : Bool) : async HttpRequestResult {
      Prim.cyclesAdd<system>(21_000_000_000);
      await IC.http_request({
        url = url;
        max_response_bytes = ?2_000_000; // 2 MB cap
        method = #get;
        headers = [{ name = "Accept"; value = "text/csv" }];
        body = null;
        transform = if (applyTransform) {
          ?{
            function = transform;
            context = "" : Blob;
          };
        } else { null };
        is_replicated = ?false;
      });
    };

    // Helper: check whether a status code is a redirect
    let isRedirect = func(status : Nat) : Bool {
      status == 301 or status == 302 or status == 303 or status == 307 or status == 308;
    };

    // Helper: extract Location header value from a response
    let locationHeader = func(headers : [HttpHeader]) : ?Text {
      var loc : ?Text = null;
      for (h in headers.vals()) {
        if (h.name.toLower() == "location") {
          loc := ?h.value;
        };
      };
      loc;
    };

    try {
      // First request: no transform so raw headers (including Location) are preserved
      let response = await makeRequest(SHEET_CSV_URL, false);

      // Follow one level of redirect (301/302/303/307/308)
      let finalResponse = if (isRedirect(response.status)) {
        switch (locationHeader(response.headers)) {
          case (?redirectUrl) {
            // Second request: apply transform for IC consensus on final data
            await makeRequest(redirectUrl, true);
          };
          case null {
            return #err("Redirect received but no Location header found (status " # debug_show(response.status) # ")");
          };
        };
      } else {
        response;
      };

      if (finalResponse.status < 200 or finalResponse.status >= 300) {
        return #err("HTTP error: status " # debug_show(finalResponse.status));
      };

      switch (finalResponse.body.decodeUtf8()) {
        case (?csv) {
          cachedCsv := csv;
          cacheTimestamp := now;
          #ok(csv);
        };
        case null {
          #err("Could not decode response body as UTF-8");
        };
      };
    } catch (err) {
      #err("HTTP outcall failed: " # err.message());
    };
  };
};
