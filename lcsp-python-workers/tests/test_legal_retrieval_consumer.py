from lcsp_workers.legal.legal_retrieval_consumer import LegalRetrievalConsumer


class DummyConfig:
    nestjs_api_base_url = "http://example.test"
    worker_api_key = "secret"


class DummyApiClient:
    def __init__(self):
        self.calls = []

    def get_verified_profile_by_id(self, verified_profile_id):
        self.calls.append(("verified_profile", verified_profile_id))
        return {
            "id": verified_profile_id,
            "mergedProfile": {
                "businessProcess": "AUTOMATED_DECISION",
                "automationLevel": "FULLY_AUTOMATED",
            },
            "evidenceRefs": [{"id": "e1", "lifecycle": "VERIFIED", "confidence": 0.9}],
        }

    def get_active_legal_rule_catalog(self):
        self.calls.append(("catalog", None))
        return {
            "versionId": "catalog-v1",
            "rules": [
                {
                    "legalRuleId": "RULE-A",
                    "requiredFacts": [
                        {"field": "businessProcess", "expectedValue": "AUTOMATED_DECISION"},
                        {"field": "automationLevel", "expectedValue": "FULLY_AUTOMATED"},
                    ],
                    "optionalFacts": [],
                    "blockingFacts": [],
                    "unknownFactPolicy": "BLOCK_ON_UNKNOWN",
                    "citationLocatorRefs": [{"documentId": "doc-1", "locator": "art-1"}],
                }
            ],
        }

    def get_active_legal_corpus(self):
        self.calls.append(("corpus", None))
        return {"versionId": "corpus-v1", "status": "APPROVED"}

    def post_legal_rule_match_callback(self, payload):
        self.calls.append(("callback", payload))
        return payload


def test_consumer_fetches_data_and_submits_callback():
    api_client = DummyApiClient()
    consumer = LegalRetrievalConsumer(DummyConfig(), api_client=api_client)

    consumer.handle(
        {"verifiedProfileId": "vp-1", "assessmentId": "assessment-1"},
        correlation_id="corr-1",
    )

    assert any(call[0] == "verified_profile" for call in api_client.calls)
    assert any(call[0] == "catalog" for call in api_client.calls)
    assert any(call[0] == "corpus" for call in api_client.calls)
    assert any(call[0] == "callback" for call in api_client.calls)

    callback_payload = next(call[1] for call in api_client.calls if call[0] == "callback")
    assert callback_payload.verified_profile_id == "vp-1"
    assert callback_payload.assessment_id == "assessment-1"
    assert callback_payload.corpus_version_id == "corpus-v1"
    assert callback_payload.legal_rule_catalog_version_id == "catalog-v1"
    assert callback_payload.matches[0]["match_id"].startswith("RULE-A")
    assert callback_payload.citation_allowlist == ["doc-1::art-1"]
    assert callback_payload.overall_coverage_status == "COMPLETE_CITATION"
