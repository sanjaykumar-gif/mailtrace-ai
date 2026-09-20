// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EmailForensicLedger
 * @author MailTrace AI Core Team
 * @notice Decentralized, immutable forensic chain of custody for email security incidents.
 * Anchors cryptographic SHA-256 fingerprints, risk scores, and attack signatures to prevent tampering in legal & compliance proceedings.
 */
contract EmailForensicLedger {
    struct Evidence {
        bytes32 emailHash;        // SHA-256 fingerprint of canonical RFC-5322 headers
        string senderDomain;     // e.g. "paypa1-support-auth.com"
        uint8 riskScore;         // 0 - 100 Risk Verdict
        string classification;   // CRITICAL, HIGH, MEDIUM, LOW, SAFE
        uint256 blockTimestamp;  // Immutable block time
        uint256 blockNumber;    // Chain block height
        address forensicAnalyst; // Submitting analyst or automated SOC node
        string attackCampaignId; // e.g. "CMP-7F2A" or "NONE"
    }

    // Mapping from SHA-256 emailHash to Evidence record
    mapping(bytes32 => Evidence) private _evidenceRegistry;

    // Array of all anchored email hashes for indexation
    bytes32[] private _anchoredHashes;

    // Events for real-time Web3 SOC indexing
    event EvidenceAnchored(
        bytes32 indexed emailHash,
        string senderDomain,
        uint8 riskScore,
        string classification,
        uint256 indexed timestamp,
        address indexed analyst,
        string attackCampaignId
    );

    event EvidenceVerified(
        bytes32 indexed emailHash,
        bool exists,
        uint256 timestamp,
        address verifiedBy
    );

    /**
     * @notice Anchor a new forensic email verdict onto the blockchain.
     * @param _emailHash SHA-256 hash of the email headers and verdict
     * @param _senderDomain Domain of the sender
     * @param _riskScore Risk score calculated by MailTrace AI (0 - 100)
     * @param _classification Security classification string
     * @param _attackCampaignId Correlated campaign cluster identifier
     */
    function anchorEvidence(
        bytes32 _emailHash,
        string calldata _senderDomain,
        uint8 _riskScore,
        string calldata _classification,
        string calldata _attackCampaignId
    ) external returns (bool) {
        require(_emailHash != bytes32(0), "Invalid email hash");
        require(_evidenceRegistry[_emailHash].blockTimestamp == 0, "Evidence already anchored");

        Evidence memory newEvidence = Evidence({
            emailHash: _emailHash,
            senderDomain: _senderDomain,
            riskScore: _riskScore,
            classification: _classification,
            blockTimestamp: block.timestamp,
            blockNumber: block.number,
            forensicAnalyst: msg.sender,
            attackCampaignId: bytes(_attackCampaignId).length > 0 ? _attackCampaignId : "NONE"
        });

        _evidenceRegistry[_emailHash] = newEvidence;
        _anchoredHashes.push(_emailHash);

        emit EvidenceAnchored(
            _emailHash,
            _senderDomain,
            _riskScore,
            _classification,
            block.timestamp,
            msg.sender,
            _attackCampaignId
        );

        return true;
    }

    /**
     * @notice Verify if a given email SHA-256 hash exists on-chain and retrieve its forensic record.
     * @param _emailHash The SHA-256 hash to query
     */
    function verifyEvidence(bytes32 _emailHash) external returns (bool exists, Evidence memory evidence) {
        Evidence memory record = _evidenceRegistry[_emailHash];
        exists = record.blockTimestamp > 0;
        
        emit EvidenceVerified(_emailHash, exists, block.timestamp, msg.sender);
        return (exists, record);
    }

    /**
     * @notice Read-only inspection of anchored evidence.
     */
    function getEvidence(bytes32 _emailHash) external view returns (Evidence memory) {
        require(_evidenceRegistry[_emailHash].blockTimestamp > 0, "Evidence hash not found");
        return _evidenceRegistry[_emailHash];
    }

    /**
     * @notice Get total count of anchored forensic cases.
     */
    function getTotalAnchored() external view returns (uint256) {
        return _anchoredHashes.length;
    }

    /**
     * @notice Get list of all anchored hashes with pagination.
     */
    function getAnchoredHashes(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        uint256 total = _anchoredHashes.length;
        if (offset >= total) {
            return new bytes32[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 resultSize = end - offset;
        bytes32[] memory results = new bytes32[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            results[i] = _anchoredHashes[offset + i];
        }
        return results;
    }
}
