// Offizielles AWS-Beispiel (IAM ListUsers, 2015-08-30) aus der SigV4-Dokumentation
const assert = require("assert"); const { sigv4 } = require("../lib/ai");
const h = sigv4({ method: "GET", url: "https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08",
  headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" }, body: "", region: "us-east-1", service: "iam",
  accessKey: "AKIDEXAMPLE", secretKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", amzDate: "20150830T123600Z" });
assert.strictEqual(h.Authorization.split("Signature=")[1], "5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7");
console.log("PASS AWS-Signatur = offizieller AWS-Prüfwert");
