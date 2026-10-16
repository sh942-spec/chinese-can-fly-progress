# Chinese Can Fly — shared progress monitor

Read-only browser dashboard for the public repository https://github.com/haydenYang666/SYSEN5300_hackathon.

Open the shared webpage in a browser. It checks GitHub every 600 seconds while open. It does not require the original user's computer, a GitHub token, any AI calls, or local software. Browser suspension, loss of connection, or GitHub's unauthenticated rate limit can delay refreshes. The screen preserves the last successful result and labels stale data. No unattended polling runs when all browser tabs are closed.

Progress uses the same custom 100-point delivery milestones as the local monitor. It is not a judging score. H-01 through H-08 have weights 10, 10, 25, 25, 10, 10, 5, 5. File milestones provide partial credit only; final acceptance requires the ledger's done status and a result. Relevant file changes observed after acceptance invalidate that acceptance until the ledger result is updated. History and acceptance observations are browser-local, so different browsers can have different histories and observations. Work not pushed to the public main branch is not visible.

This separate dashboard never writes to the team's repository or changes its task ledger. The dedicated public source repository holds only dashboard files; GitHub Pages serves the static website. No credentials are included in the website.

For H-02, the CSV milestone recognizes a group of 2–3 CSV files in the same directory under data/, including nested collection folders. Extra supplemental or real-data collections do not invalidate an existing candidate group. A root data/README.md or a candidate group's README supplies the codebook file milestone. These file checks award at most 5/10; the remaining 5 require recorded ledger acceptance, and file presence alone is not content or browser validation.

Run local scoring regressions with `node --test monitor.test.mjs`.

H-04 acceptance tracks application and API-test changes, including its statistical dependency. The two deployment-owned files `app/manifest.json` and `app/.python-version` are tracked by H-06 instead, so adding or updating them does not revoke H-04's local application acceptance. Existing browser acceptance caches use the same scope filter; actual application changes still require renewed acceptance.

Third-party YAML parser: js-yaml 4.1.1, MIT, https://github.com/nodeca/js-yaml/tree/4.1.1. The pinned browser bundle and its license are in vendor/. The parser uses JSON_SCHEMA and rejects duplicate YAML keys; repository content is treated only as data.
