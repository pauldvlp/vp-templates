export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Off. Bodies legitimately carry things that cannot wrap at 100 columns —
    // compare URLs, stack traces, dependency tables. Dependabot writes exactly that
    // and would otherwise fail every one of its PRs, while its header (which we do
    // control, via .github/dependabot.yml) is always well-formed. Every rule that
    // carries real signal — type, scope, subject — stays on, for bots and humans.
    'body-max-line-length': [0],
  },
};
