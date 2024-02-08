use std::time::Duration;
use wasm_bindgen::prelude::*;
// use web_time::{Duration, UNIX_EPOCH};
use elliptic_curve::pkcs8::DecodePublicKey;

use tlsn_core::proof::SessionProof;

extern crate web_sys;

// A macro to provide `log!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

#[wasm_bindgen]
pub fn verifyProofs(session_proof: &str, substrings_proof: &str, body_start: usize) -> String {
    let session_proof: SessionProof = serde_json::from_str(session_proof).unwrap();
    let substrings_proof: tlsn_core::proof::SubstringsProof =
        serde_json::from_str(substrings_proof).unwrap();

    // Verify the session proof against the Notary's public key
    //
    // This verifies the identity of the server using a default certificate verifier which trusts
    // the root certificates from the `webpki-roots` crate.
    session_proof
        .verify_with_default_cert_verifier(notary_pubkey())
        .unwrap();

    // Verifier logic below
    let SessionProof { header, .. } = session_proof;

    // The time at which the session was recorded
    let _time = chrono::DateTime::UNIX_EPOCH + Duration::from_secs(header.time());

    // Verify the substrings proof against the session header.
    // This returns the redacted transcripts
    let (sent, recv) = substrings_proof.verify(&header).unwrap();

    let recv_data = recv.data();
    let received: Vec<String> = recv
        .authed()
        .clone()
        .iter_ranges()
        .map(|recv_range| String::from_utf8(recv_data[recv_range].to_vec()).unwrap())
        .collect();
    let received_str = received[body_start..].join("\"<REDACTED>\"");
    let other_received: Vec<String> = received[..body_start].to_vec();

    let response = serde_json::json!({
        "sent": String::from_utf8(sent.data().to_vec()).unwrap(),
        "received": received_str,
        "other_received": other_received,
    });

    return serde_json::to_string(&response).unwrap();
}

/// Returns a Notary pubkey trusted by this Verifier
fn notary_pubkey() -> p256::PublicKey {
    let pub_key = "-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBv36FI4ZFszJa0DQFJ3wWCXvVLFr
cRzMG5kaTeHGoSzDu6cFqx3uEWYpFGo6C0EOUgf+mEgbktLrXocv5yHzKg==
-----END PUBLIC KEY-----";
    let key = p256::PublicKey::from_public_key_pem(pub_key);
    key.unwrap()
}
