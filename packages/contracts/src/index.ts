/**
 * `packages/contracts` — the keystone.
 *
 * DTOs, the French error catalog, the capability registry and the action registry.
 * Everything downstream is generated from or validated against this package, so a change
 * starts here and the types propagate (`CLAUDE.md` §Stack).
 */

// Value types — 00-shared-contract.md:48–53 and 20-data-api-contract-details.md:22
export {
  decimalSchema,
  isDecimal,
  decimal,
  scaleOf,
  signOf,
  type Decimal,
} from './value/decimal.js';
export { moneySchema, currencyCodeSchema, sameCurrency, type Money } from './value/money.js';
export {
  quantitySchema,
  transactionQuantitySchema,
  sameUnit,
  type Quantity,
} from './value/quantity.js';
export {
  RESOURCE_KINDS,
  COINED_RESOURCE_KINDS,
  isCoinedResourceKind,
  resourceKindSchema,
  resourceRefSchema,
  sameResource,
  DATA_CLASSIFICATIONS,
  dataClassificationSchema,
  type ResourceKind,
  type ResourceRef,
  type DataClassification,
} from './value/resource-ref.js';
export {
  evidenceRefSchema,
  evidenceLocatorSchema,
  type EvidenceRef,
  type EvidenceLocator,
} from './value/evidence-ref.js';
export { canonicalize, CanonicalizationError } from './value/canonical.js';
export {
  snapshotRefSchema,
  versionSchema,
  contentDigestSchema,
  contentDigest,
  matchesSnapshot,
  DIGEST_ALGORITHM,
  type SnapshotRef,
} from './value/snapshot-ref.js';
export {
  typedValueSchema,
  TYPED_VALUE_KINDS,
  comparable,
  type TypedValue,
  type TypedValueKind,
} from './value/typed-value.js';

// Errors — 00-shared-contract.md:102–117
export {
  ERROR_CATALOG,
  ERROR_CODES,
  HTTP_STATUS,
  isErrorCode,
  type ErrorCode,
  type ErrorDefinition,
  type HttpStatus,
} from './errors/catalog.js';
export {
  apiErrorSchema,
  fieldErrorSchema,
  buildError,
  renderMessage,
  httpStatusFor,
  ErrorCatalogError,
  type ApiError,
  type FieldError,
  type BuildErrorOptions,
} from './errors/api-error.js';

// Registries — 00-shared-contract.md:64–86
export {
  CAPABILITY_REGISTRY,
  CAPABILITIES,
  isCapability,
  capabilitiesOfModule,
  MODULES_WITHOUT_CAPABILITIES,
  type Capability,
  type CapabilityDefinition,
} from './registry/capabilities.js';
export {
  ROLE_BUNDLE_ENTRIES,
  ROLE_BUNDLE_POLICY_KEY,
  UNASSIGNED_CAPABILITIES,
  capabilitiesOfRole,
  roleGrants,
} from './registry/role-bundles.js';
export {
  ROLE_REGISTRY,
  ROLE_CODES,
  STAFF_ROLES,
  EXTERNAL_ROLES,
  isRoleCode,
  type RoleCode,
  type RoleDefinition,
} from './registry/roles.js';
export {
  ACTION_REGISTRY,
  CONTROLLED_ACTIONS,
  OPEN_DECISIONS,
  isControlledAction,
  controlledAction,
  requiredDecisionsFor,
  requiresDistinctPerson,
  conditionalDecisionsFor,
  type ControlledAction,
  type ControlledActionCode,
  type RequiredDecision,
} from './registry/actions.js';

// States — 00-shared-contract.md:90, :94
export {
  REVIEW_STATES,
  REVIEW_STATE_CODES,
  REVIEW_TRANSITIONS,
  reviewStateSchema,
  canTransition,
  isConsumable,
  type ReviewState,
} from './states/review.js';
export {
  EXTERNAL_STATES,
  EXTERNAL_STATE_CODES,
  EVIDENCE_BACKED_EXTERNAL_STATES,
  externalStateSchema,
  requiresVerifiedEvidence,
  type ExternalState,
} from './states/external.js';

export {
  PREDICATE_OPERATORS,
  fieldPathSchema,
  predicateSchema,
  isLeaf,
  fieldPathsOf,
  POLICY_STATES,
  isUsablePolicyState,
  policyKeySchema,
  UNCONFIRMED_FR,
  type Predicate,
  type PredicateLeaf,
  type PredicateOperator,
  type PolicyState,
} from './rules/index.js';

export * from './policy/index.js';

export { COMPONENT_SCHEMAS, componentSchemas, type ComponentSchemaName } from './openapi.js';
