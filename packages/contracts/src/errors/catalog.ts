/**
 * The shared error catalog of `00-shared-contract.md:104–116`, verbatim.
 *
 * `:117` — *"All visible enum labels and module-specific errors extend this catalog."*
 * Modules add entries here, with their French copy, **before** using a code
 * (`CLAUDE.md` §Errors). A code with no French copy is a screen that shows an English
 * identifier to a French-speaking user.
 *
 * The HTTP status on each entry comes from `:103`. It is part of the catalog rather than
 * chosen at each throw site, because the same business failure returning 409 in one route
 * and 422 in another is how a client ends up special-casing routes.
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  STALE_ETAG: 412,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE: 422,
  PRECONDITION_REQUIRED: 428,
  RATE_LIMITED: 429,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export interface ErrorDefinition {
  /** French copy shown to the user. `00-shared-contract.md:104–116`. */
  readonly message_fr: string;
  readonly http_status: HttpStatus;
  /**
   * Whether an unchanged retry could succeed. `DEPENDENCY_UNAVAILABLE` is retryable;
   * `FORBIDDEN` is not, and a client that retries it just burns the rate limit.
   */
  readonly retryable: boolean;
  /** Placeholders the copy interpolates, e.g. `{libellé}`. */
  readonly placeholders?: readonly string[];
}

export const ERROR_CATALOG = {
  REQUIRED: {
    message_fr: 'Ce champ est obligatoire.',
    http_status: HTTP_STATUS.UNPROCESSABLE,
    retryable: false,
  },
  INVALID_REFERENCE: {
    message_fr: "La référence sélectionnée n'est pas disponible.",
    http_status: HTTP_STATUS.UNPROCESSABLE,
    retryable: false,
  },
  FORBIDDEN: {
    message_fr: "Vous n'êtes pas autorisé à effectuer cette action.",
    http_status: HTTP_STATUS.FORBIDDEN,
    retryable: false,
  },
  NOT_FOUND: {
    // `:103` — 404 covers "absent/inaccessible scoped resource". The copy says both,
    // because telling a user which one it is confirms the record exists.
    message_fr: 'Cet élément est introuvable ou inaccessible.',
    http_status: HTTP_STATUS.NOT_FOUND,
    retryable: false,
  },
  VERSION_CONFLICT: {
    message_fr: 'Cet élément a été modifié. Rechargez-le avant de continuer.',
    http_status: HTTP_STATUS.STALE_ETAG,
    retryable: false,
  },
  POLICY_REQUIRED: {
    // The one entry with a placeholder. `:117` — unknown required policy appears to the
    // user as `À confirmer`; the English register keeps "assumption to verify".
    message_fr: "Configuration à valider : {libellé}. Cette action n'est pas disponible.",
    http_status: HTTP_STATUS.UNPROCESSABLE,
    retryable: false,
    placeholders: ['libellé'],
  },
  APPROVAL_REQUIRED: {
    message_fr: 'Une validation habilitée est nécessaire.',
    http_status: HTTP_STATUS.UNPROCESSABLE,
    retryable: false,
  },
  APPROVAL_STALE: {
    message_fr: 'Les données ont changé depuis la validation. Un nouvel examen est nécessaire.',
    http_status: HTTP_STATUS.CONFLICT,
    retryable: false,
  },
  EXTERNAL_EVIDENCE_REQUIRED: {
    message_fr: "Ajoutez une preuve vérifiée de la décision de l'organisme.",
    http_status: HTTP_STATUS.UNPROCESSABLE,
    retryable: false,
  },
  DUPLICATE: {
    message_fr: 'Un enregistrement correspondant existe déjà. Consultez-le avant de continuer.',
    http_status: HTTP_STATUS.CONFLICT,
    retryable: false,
  },
  DEPENDENCY_UNAVAILABLE: {
    // The only retryable entry, and the copy earns it: it promises the user's input was
    // kept, which `CLAUDE.md` §UI requires the screen to honour.
    message_fr: 'Le service requis est indisponible. Votre saisie a été conservée.',
    http_status: HTTP_STATUS.DEPENDENCY_UNAVAILABLE,
    retryable: true,
  },
  NO_DATA: {
    message_fr: 'Aucune donnée disponible pour cette sélection.',
    http_status: HTTP_STATUS.NOT_FOUND,
    retryable: false,
  },

  // --- Protocol-level codes named at `:100` and `:102` but absent from the copy table. --
  // They are user-visible failures, so they need French copy like any other.
  IDEMPOTENCY_CONFLICT: {
    message_fr:
      'Cette demande a déjà été envoyée avec un contenu différent. Rechargez la page avant de réessayer.',
    http_status: HTTP_STATUS.CONFLICT,
    retryable: false,
  },
  REQUEST_IN_PROGRESS: {
    // `:100` requires "safe retry guidance" with this one, so it is retryable and the
    // copy tells the user to wait rather than to resubmit.
    message_fr: 'Cette demande est en cours de traitement. Patientez avant de réessayer.',
    http_status: HTTP_STATUS.CONFLICT,
    retryable: true,
  },
  NO_ELIGIBLE_APPROVER: {
    // `00-shared-contract.md:88` specifies this copy exactly, for the case where the
    // item stays pending because separation of duty cannot be satisfied.
    message_fr: "Aucun approbateur habilité n'est disponible.",
    http_status: HTTP_STATUS.UNPROCESSABLE,
    retryable: false,
  },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export const ERROR_CODES = Object.keys(ERROR_CATALOG) as readonly ErrorCode[];

export const isErrorCode = (value: string): value is ErrorCode => value in ERROR_CATALOG;
