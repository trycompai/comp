# CompAI Integrations Catalog

Public catalog of all compliance integrations available in the [CompAI](https://trycomp.ai) platform.

**540 integrations** across 9 categories.

> Last updated: 2026-04-20

## What's in this catalog

Each `integrations/<slug>.json` file contains the public-facing metadata for one integration:

- **Vendor info:** name, slug, category, description, docs URL, base URL
- **Authentication:** auth type + customer-facing setup instructions + credential field labels
- **Checks:** names + descriptions + default severity of every compliance check we run
- **Capabilities:** employee sync support, multi-connection support

## What's NOT in this catalog

Implementation details are intentionally excluded:

- Check DSL (endpoint paths, request bodies, response parsing, aggregation logic)
- Sync definition (how we extract employees)
- Internal database IDs
- Credential field format hints or placeholders
- Vendor logos

## How to read a definition

```bash
curl https://raw.githubusercontent.com/trycompai/comp/main/integrations-catalog/integrations/axonius.json | jq
```

## Summary by category

- **Security** — 120 integrations
- **Productivity** — 111 integrations
- **HR & People** — 61 integrations
- **Cloud** — 53 integrations
- **Development** — 52 integrations
- **Monitoring** — 48 integrations
- **Communication** — 46 integrations
- **Infrastructure** — 29 integrations
- **Identity & Access** — 20 integrations

## Full catalog

### Cloud (53)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [Airbyte](integrations/airbyte.json) | `airbyte` | api_key | 2 |  |
| [Aiven](integrations/aiven.json) | `aiven` | api_key | 2 |  |
| [Anthropic](integrations/anthropic.json) | `anthropic` | api_key | 2 |  |
| [Box](integrations/box.json) | `box` | oauth2 | 2 |  |
| [Brex](integrations/brex.json) | `brex` | api_key | 1 |  |
| [Civo](integrations/civo.json) | `civo` | api_key | 2 |  |
| [ClickHouse Cloud](integrations/clickhouse.json) | `clickhouse` | api_key | 2 |  |
| [Cloudinary](integrations/cloudinary.json) | `cloudinary` | custom | 2 |  |
| [CockroachDB](integrations/cockroachdb.json) | `cockroachdb` | api_key | 2 |  |
| [Cohere](integrations/cohere.json) | `cohere` | api_key | 2 |  |
| [Convex](integrations/convex.json) | `convex` | custom | 3 |  |
| [Databricks](integrations/databricks.json) | `databricks` | api_key | 2 |  |
| [Datadog](integrations/datadog.json) | `datadog` | custom | 3 |  |
| [dbt Cloud](integrations/dbt-cloud.json) | `dbt-cloud` | api_key | 2 |  |
| [Deepgram](integrations/deepgram.json) | `deepgram` | api_key | 2 |  |
| [DigitalOcean](integrations/digitalocean.json) | `digitalocean` | api_key | 2 |  |
| [Doppler](integrations/doppler.json) | `doppler` | api_key | 2 |  |
| [Egnyte](integrations/egnyte.json) | `egnyte` | custom | 3 | ✓ |
| [Elastic Cloud](integrations/elastic-cloud.json) | `elastic-cloud` | custom | 2 |  |
| [Firebase](integrations/firebase.json) | `firebase` | oauth2 | 3 |  |
| [Fireworks AI](integrations/fireworks-ai.json) | `fireworks-ai` | api_key | 2 |  |
| [Fivetran](integrations/fivetran.json) | `fivetran` | custom | 2 |  |
| [Fly.io](integrations/fly.json) | `fly` | api_key | 2 |  |
| [Google Cloud](integrations/google-cloud.json) | `google-cloud` | oauth2 | 2 |  |
| [Groq](integrations/groq.json) | `groq` | api_key | 2 |  |
| [Heroku](integrations/heroku.json) | `heroku` | custom | 2 |  |
| [Hetzner Cloud](integrations/hetzner.json) | `hetzner` | api_key | 2 |  |
| [Hugging Face](integrations/huggingface.json) | `huggingface` | api_key | 2 |  |
| [IONOS Cloud](integrations/ionos.json) | `ionos` | custom | 2 |  |
| [Linode](integrations/linode.json) | `linode` | api_key | 2 |  |
| [Mistral AI](integrations/mistral.json) | `mistral` | api_key | 2 |  |
| [MongoDB Atlas](integrations/mongodb-atlas.json) | `mongodb-atlas` | custom | 5 |  |
| [MotherDuck](integrations/motherduck.json) | `motherduck` | api_key | 2 |  |
| [Neon](integrations/neon.json) | `neon` | api_key | 2 |  |
| [Netlify](integrations/netlify.json) | `netlify` | api_key | 2 |  |
| [Oracle Cloud Infrastructure](integrations/oracle-cloud.json) | `oracle-cloud` | custom | 3 |  |
| [Quave Cloud](integrations/quave-cloud.json) | `quave-cloud` | custom | 4 |  |
| [Redis Cloud](integrations/redis-cloud.json) | `redis-cloud` | custom | 2 |  |
| [Render](integrations/render.json) | `render` | api_key | 2 |  |
| [Roboflow](integrations/roboflow.json) | `roboflow` | api_key | 2 |  |
| [Scaleway](integrations/scaleway.json) | `scaleway` | api_key | 2 |  |
| [Segment](integrations/segment.json) | `segment` | api_key | 2 |  |
| [Snowflake](integrations/snowflake.json) | `snowflake` | custom | 2 |  |
| [Supabase](integrations/supabase.json) | `supabase` | api_key | 10 |  |
| [Together AI](integrations/together-ai.json) | `together-ai` | api_key | 2 |  |
| [Turso](integrations/turso.json) | `turso` | api_key | 2 |  |
| [UpCloud](integrations/upcloud.json) | `upcloud` | basic | 2 |  |
| [Upstash](integrations/upstash.json) | `upstash` | custom | 2 |  |
| [Vercel](integrations/vercel.json) | `vercel` | api_key | 2 |  |
| [Vultr](integrations/vultr.json) | `vultr` | api_key | 2 |  |
| [Webflow](integrations/webflow.json) | `webflow` | api_key | 2 |  |
| [Weights & Biases](integrations/wandb.json) | `wandb` | api_key | 2 |  |
| [Xata](integrations/xata.json) | `xata` | api_key | 2 |  |

### Communication (46)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [ActiveCampaign](integrations/activecampaign.json) | `activecampaign` | custom | 2 |  |
| [Aircall](integrations/aircall.json) | `aircall` | basic | 3 | ✓ |
| [Barracuda Email Gateway Defense](integrations/barracuda-email-gateway-defense.json) | `barracuda-email-gateway-defense` | oauth2 | 3 |  |
| [beehiiv](integrations/beehiiv.json) | `beehiiv` | api_key | 2 |  |
| [Bird](integrations/bird.json) | `bird` | custom | 2 |  |
| [Braze](integrations/braze.json) | `braze` | custom | 2 |  |
| [Brevo](integrations/brevo.json) | `brevo` | api_key | 2 |  |
| [Courier](integrations/courier.json) | `courier` | api_key | 2 |  |
| [Customer.io](integrations/customer-io.json) | `customer-io` | api_key | 2 |  |
| [Daily](integrations/daily-co.json) | `daily-co` | custom | 2 |  |
| [Dialpad](integrations/dialpad.json) | `dialpad` | api_key | 3 | ✓ |
| [Discord](integrations/discord.json) | `discord` | custom | 2 |  |
| [Dixa](integrations/dixa.json) | `dixa` | custom | 2 |  |
| [Drift](integrations/drift.json) | `drift` | custom | 1 |  |
| [Drip](integrations/drip.json) | `drip` | custom | 2 |  |
| [Front](integrations/front.json) | `front` | api_key | 2 |  |
| [Gorgias](integrations/gorgias.json) | `gorgias` | custom | 2 |  |
| [Help Scout](integrations/helpscout.json) | `helpscout` | api_key | 2 |  |
| [Hunter](integrations/hunter.json) | `hunter` | custom | 2 |  |
| [Intercom](integrations/intercom.json) | `intercom` | custom | 2 |  |
| [Iterable](integrations/iterable.json) | `iterable` | custom | 2 |  |
| [Kit (ConvertKit)](integrations/convertkit.json) | `convertkit` | api_key | 2 |  |
| [Knock](integrations/knock.json) | `knock` | api_key | 2 |  |
| [Kustomer](integrations/kustomer.json) | `kustomer` | custom | 1 |  |
| [Loops](integrations/loops.json) | `loops` | api_key | 2 |  |
| [Mattermost](integrations/mattermost.json) | `mattermost` | api_key | 2 |  |
| [MessageBird](integrations/messagebird.json) | `messagebird` | custom | 2 |  |
| [Microsoft Teams](integrations/microsoft-teams.json) | `microsoft-teams` | custom | 2 |  |
| [Mimecast](integrations/mimecast.json) | `mimecast` | custom | 4 |  |
| [Novu](integrations/novu.json) | `novu` | api_key | 2 |  |
| [Omnisend](integrations/omnisend.json) | `omnisend` | custom | 2 |  |
| [OpenPhone](integrations/openphone.json) | `openphone` | api_key | 2 |  |
| [Plain](integrations/plain.json) | `plain` | api_key | 2 |  |
| [Postmark](integrations/postmark.json) | `postmark` | api_key | 2 |  |
| [Pylon](integrations/pylon.json) | `pylon` | api_key | 2 |  |
| [Resend](integrations/resend.json) | `resend` | api_key | 2 |  |
| [RingCentral](integrations/ringcentral.json) | `ringcentral` | oauth2 | 2 | ✓ |
| [SendGrid](integrations/sendgrid.json) | `sendgrid` | api_key | 2 |  |
| [Slack](integrations/slack.json) | `slack` | oauth2 | 2 |  |
| [TeamSupport](integrations/teamsupport.json) | `teamsupport` | custom | 2 |  |
| [Telnyx](integrations/telnyx.json) | `telnyx` | custom | 2 |  |
| [Twilio](integrations/twilio.json) | `twilio` | custom | 2 |  |
| [Vonage](integrations/vonage.json) | `vonage` | custom | 2 |  |
| [Webex](integrations/webex.json) | `webex` | api_key | 2 |  |
| [Wistia](integrations/wistia.json) | `wistia` | custom | 2 |  |
| [Zoom](integrations/zoom.json) | `zoom` | oauth2 | 2 |  |

### Development (52)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [Algolia](integrations/algolia.json) | `algolia` | custom | 2 |  |
| [Azure DevOps](integrations/azure-devops.json) | `azure-devops` | custom | 3 |  |
| [Baseten](integrations/baseten.json) | `baseten` | custom | 2 |  |
| [Bitbucket](integrations/bitbucket.json) | `bitbucket` | custom | 2 |  |
| [BrowserStack](integrations/browserstack.json) | `browserstack` | custom | 2 |  |
| [Buddy](integrations/buddy.json) | `buddy` | api_key | 2 |  |
| [Buildkite](integrations/buildkite.json) | `buildkite` | api_key | 2 |  |
| [Census](integrations/census.json) | `census` | api_key | 2 |  |
| [CircleCI](integrations/circleci.json) | `circleci` | custom | 2 |  |
| [Cloudsmith](integrations/cloudsmith.json) | `cloudsmith` | api_key | 2 |  |
| [Codacy](integrations/codacy.json) | `codacy` | custom | 2 |  |
| [Codecov](integrations/codecov.json) | `codecov` | api_key | 2 |  |
| [Codefresh](integrations/codefresh.json) | `codefresh` | api_key | 2 |  |
| [Docker Hub](integrations/docker-hub.json) | `docker-hub` | custom | 3 |  |
| [Flagsmith](integrations/flagsmith.json) | `flagsmith` | custom | 2 |  |
| [GitBook](integrations/gitbook.json) | `gitbook` | api_key | 2 |  |
| [GitHub](integrations/github.json) | `github` | api_key | 2 |  |
| [GitHub Copilot](integrations/github-copilot.json) | `github-copilot` | oauth2 | 3 |  |
| [GitLab](integrations/gitlab.json) | `gitlab` | custom | 3 |  |
| [Harness](integrations/harness.json) | `harness` | api_key | 2 |  |
| [Hightouch](integrations/hightouch.json) | `hightouch` | api_key | 3 |  |
| [Inngest](integrations/inngest.json) | `inngest` | api_key | 2 |  |
| [Jenkins](integrations/jenkins.json) | `jenkins` | basic | 2 |  |
| [JFrog Artifactory](integrations/jfrog.json) | `jfrog` | custom | 2 |  |
| [Jira](integrations/jira.json) | `jira` | custom | 2 |  |
| [LambdaTest](integrations/lambdatest.json) | `lambdatest` | custom | 2 |  |
| [LaunchDarkly](integrations/launchdarkly.json) | `launchdarkly` | api_key | 2 |  |
| [Linear](integrations/linear.json) | `linear` | custom | 2 |  |
| [Liveblocks](integrations/liveblocks.json) | `liveblocks` | api_key | 2 |  |
| [Mabl](integrations/mabl.json) | `mabl` | custom | 2 |  |
| [Mintlify](integrations/mintlify.json) | `mintlify` | custom | 2 |  |
| [OpenAI](integrations/openai.json) | `openai` | custom | 2 |  |
| [Optimizely](integrations/optimizely.json) | `optimizely` | api_key | 2 |  |
| [Pipedream](integrations/pipedream.json) | `pipedream` | api_key | 2 |  |
| [Port](integrations/port-io.json) | `port-io` | api_key | 2 |  |
| [Postman](integrations/postman.json) | `postman` | api_key | 2 |  |
| [Prefect](integrations/prefect.json) | `prefect` | api_key | 2 |  |
| [Qase](integrations/qase.json) | `qase` | api_key | 2 |  |
| [ReadMe](integrations/readme.json) | `readme` | custom | 2 |  |
| [Replicate](integrations/replicate.json) | `replicate` | custom | 2 |  |
| [Shortcut](integrations/shortcut.json) | `shortcut` | api_key | 2 |  |
| [SonarCloud](integrations/sonarqube-cloud.json) | `sonarqube-cloud` | api_key | 2 |  |
| [SonarQube Server](integrations/sonarqube-server.json) | `sonarqube-server` | custom | 3 |  |
| [Sonatype Nexus Repository](integrations/sonatype-nexus.json) | `sonatype-nexus` | custom | 4 |  |
| [Speakeasy](integrations/speakeasy.json) | `speakeasy` | api_key | 2 |  |
| [Split](integrations/split.json) | `split` | api_key | 2 |  |
| [Stitch](integrations/stitch.json) | `stitch` | api_key | 2 |  |
| [Stoplight](integrations/stoplight.json) | `stoplight` | custom | 2 |  |
| [TeamCity](integrations/teamcity.json) | `teamcity` | custom | 3 |  |
| [TestRail](integrations/testrail.json) | `testrail` | custom | 2 |  |
| [Travis CI](integrations/travis-ci.json) | `travis-ci` | custom | 2 |  |
| [Trigger.dev](integrations/trigger-dev.json) | `trigger-dev` | custom | 2 |  |

### HR & People (61)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [15Five](integrations/15five.json) | `15five` | api_key | 2 |  |
| [ADP](integrations/adp.json) | `adp` | custom | 3 | ✓ |
| [AlexisHR](integrations/alexishr.json) | `alexishr` | api_key | 2 | ✓ |
| [Ashby](integrations/ashby.json) | `ashby` | custom | 1 |  |
| [BambooHR](integrations/bamboohr.json) | `bamboohr` | custom | 2 |  |
| [Bonusly](integrations/bonusly.json) | `bonusly` | custom | 1 |  |
| [Breathe HR](integrations/breathe-hr.json) | `breathe-hr` | custom | 2 | ✓ |
| [Ceridian Dayforce](integrations/ceridian-dayforce.json) | `ceridian-dayforce` | custom | 2 | ✓ |
| [ChartHop](integrations/charthop.json) | `charthop` | custom | 3 | ✓ |
| [Checkr](integrations/checkr.json) | `checkr` | api_key | 2 |  |
| [Darwinbox](integrations/darwinbox.json) | `darwinbox` | custom | 3 | ✓ |
| [Deel](integrations/deel.json) | `deel` | api_key | 2 |  |
| [Deputy](integrations/deputy.json) | `deputy` | custom | 2 | ✓ |
| [Employment Hero](integrations/employment-hero.json) | `employment-hero` | custom | 3 | ✓ |
| [Factorial](integrations/factorial.json) | `factorial` | custom | 2 |  |
| [Freshteam](integrations/freshteam.json) | `freshteam` | custom | 3 | ✓ |
| [Greenhouse](integrations/greenhouse.json) | `greenhouse` | api_key | 2 |  |
| [Gusto](integrations/gusto.json) | `gusto` | oauth2 | 2 |  |
| [HiBob](integrations/bob.json) | `bob` | basic | 2 | ✓ |
| [HiBob](integrations/hibob.json) | `hibob` | custom | 2 |  |
| [HireRight](integrations/hireright.json) | `hireright` | custom | 1 |  |
| [Humaans](integrations/humaans.json) | `humaans` | custom | 1 |  |
| [Justworks](integrations/justworks.json) | `justworks` | oauth2 | 2 | ✓ |
| [Keka](integrations/keka.json) | `keka` | custom | 4 | ✓ |
| [Kenjo](integrations/kenjo.json) | `kenjo` | api_key | 2 | ✓ |
| [Kombo](integrations/kombo.json) | `kombo` | custom | 2 |  |
| [Lattice](integrations/lattice.json) | `lattice` | api_key | 2 |  |
| [Lever](integrations/lever.json) | `lever` | custom | 1 |  |
| [Merge](integrations/merge-dev.json) | `merge-dev` | custom | 2 |  |
| [Namely](integrations/namely.json) | `namely` | custom | 1 |  |
| [Navan](integrations/navan.json) | `navan` | custom | 1 |  |
| [Nectar](integrations/nectar-hr.json) | `nectar-hr` | custom | 1 |  |
| [Oyster HR](integrations/oyster-hr.json) | `oyster-hr` | custom | 1 |  |
| [Pave](integrations/pave.json) | `pave` | custom | 1 |  |
| [Paychex](integrations/paychex.json) | `paychex` | custom | 2 |  |
| [Paycom](integrations/paycom.json) | `paycom` | custom | 2 | ✓ |
| [Paycor](integrations/paycor.json) | `paycor` | oauth2 | 2 | ✓ |
| [PayFit](integrations/payfit.json) | `payfit` | custom | 1 |  |
| [Payhawk](integrations/payhawk.json) | `payhawk` | custom | 1 |  |
| [Paylocity](integrations/paylocity.json) | `paylocity` | custom | 2 | ✓ |
| [Personio](integrations/personio.json) | `personio` | api_key | 2 |  |
| [Pingboard](integrations/pingboard.json) | `pingboard` | custom | 1 |  |
| [Qonto](integrations/qonto.json) | `qonto` | custom | 1 |  |
| [Qualtrics](integrations/qualtrics.json) | `qualtrics` | custom | 1 |  |
| [Remote](integrations/remote.json) | `remote` | api_key | 2 |  |
| [Rippling](integrations/rippling.json) | `rippling` | api_key | 2 |  |
| [Sage HR](integrations/sage-hr.json) | `sage-hr` | custom | 2 | ✓ |
| [SAP SuccessFactors](integrations/sap-successfactors.json) | `sap-successfactors` | custom | 2 | ✓ |
| [Sterling](integrations/sterling.json) | `sterling` | custom | 1 |  |
| [SurveyMonkey](integrations/surveymonkey.json) | `surveymonkey` | custom | 2 |  |
| [SurveySparrow](integrations/surveysparrow.json) | `surveysparrow` | custom | 2 |  |
| [TalentLMS](integrations/talent-lms.json) | `talent-lms` | custom | 1 |  |
| [TriNet](integrations/trinet.json) | `trinet` | api_key | 1 |  |
| [UKG Ready](integrations/ukg-ready.json) | `ukg-ready` | custom | 2 |  |
| [When I Work](integrations/when-i-work.json) | `when-i-work` | custom | 2 | ✓ |
| [Workable](integrations/workable.json) | `workable` | custom | 2 | ✓ |
| [Workday](integrations/workday.json) | `workday` | custom | 2 |  |
| [WorkRamp](integrations/workramp.json) | `workramp` | custom | 1 |  |
| [Zelt](integrations/zelt.json) | `zelt` | custom | 1 |  |
| [Zenefits](integrations/zenefits.json) | `zenefits` | api_key | 1 |  |
| [Zoho People](integrations/zoho-people.json) | `zoho-people` | custom | 2 | ✓ |

### Identity & Access (20)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [Auth0](integrations/auth0.json) | `auth0` | custom | 3 |  |
| [Clerk](integrations/clerk.json) | `clerk` | api_key | 2 |  |
| [ConductorOne](integrations/conductorone.json) | `conductorone` | custom | 5 | ✓ |
| [CyberArk](integrations/cyberark.json) | `cyberark` | custom | 3 |  |
| [Descope](integrations/descope.json) | `descope` | custom | 2 |  |
| [Duo Security](integrations/duo-security.json) | `duo-security` | custom | 2 |  |
| [Duo Security](integrations/duo.json) | `duo` | custom | 2 |  |
| [Frontegg](integrations/frontegg.json) | `frontegg` | api_key | 2 |  |
| [FusionAuth](integrations/fusionauth.json) | `fusionauth` | custom | 4 | ✓ |
| [JumpCloud](integrations/jumpcloud.json) | `jumpcloud` | custom | 3 |  |
| [Microsoft Entra ID](integrations/entra-id.json) | `entra-id` | custom | 4 | ✓ |
| [Okta](integrations/okta.json) | `okta` | custom | 3 |  |
| [OneLogin](integrations/onelogin.json) | `onelogin` | custom | 2 |  |
| [Permit.io](integrations/permit-io.json) | `permit-io` | custom | 2 |  |
| [Persona](integrations/persona.json) | `persona` | api_key | 2 |  |
| [Ping Identity](integrations/ping-identity.json) | `ping-identity` | custom | 3 |  |
| [SailPoint IdentityNow](integrations/sailpoint.json) | `sailpoint` | custom | 2 | ✓ |
| [Saviynt](integrations/saviynt.json) | `saviynt` | custom | 3 | ✓ |
| [Stytch](integrations/stytch.json) | `stytch` | custom | 2 |  |
| [WorkOS](integrations/workos.json) | `workos` | api_key | 2 |  |

### Infrastructure (29)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [Acronis Cyber Protect Cloud](integrations/acronis-cyber-protect-cloud.json) | `acronis-cyber-protect-cloud` | custom | 4 |  |
| [Akamai](integrations/akamai.json) | `akamai` | custom | 3 |  |
| [Backblaze B2](integrations/backblaze.json) | `backblaze` | custom | 2 |  |
| [Bunny.net](integrations/bunny-net.json) | `bunny-net` | custom | 2 |  |
| [Cisco Meraki](integrations/cisco-meraki.json) | `cisco-meraki` | custom | 2 |  |
| [Cloudflare](integrations/cloudflare.json) | `cloudflare` | custom | 4 |  |
| [Confluent Cloud](integrations/confluent-cloud.json) | `confluent-cloud` | basic | 4 |  |
| [Coolify](integrations/coolify.json) | `coolify` | api_key | 2 |  |
| [Datto](integrations/datto.json) | `datto` | api_key | 2 |  |
| [Druva](integrations/druva.json) | `druva` | custom | 5 |  |
| [env0](integrations/env0.json) | `env0` | api_key | 2 |  |
| [Fastly](integrations/fastly.json) | `fastly` | api_key | 2 |  |
| [KeyCDN](integrations/keycdn.json) | `keycdn` | custom | 2 |  |
| [Kong Konnect](integrations/kong.json) | `kong` | api_key | 2 |  |
| [Koyeb](integrations/koyeb.json) | `koyeb` | api_key | 2 |  |
| [ngrok](integrations/ngrok.json) | `ngrok` | api_key | 2 |  |
| [Northflank](integrations/northflank.json) | `northflank` | api_key | 2 |  |
| [NS1](integrations/ns1.json) | `ns1` | custom | 2 |  |
| [PlanetScale](integrations/planetscale.json) | `planetscale` | custom | 3 |  |
| [Pulumi](integrations/pulumi.json) | `pulumi` | api_key | 2 |  |
| [Pulumi Cloud](integrations/pulumi-cloud.json) | `pulumi-cloud` | api_key | 2 |  |
| [Qovery](integrations/qovery.json) | `qovery` | api_key | 2 |  |
| [Railway](integrations/railway.json) | `railway` | custom | 2 |  |
| [Snipe-IT](integrations/snipeit.json) | `snipeit` | custom | 3 |  |
| [Tailscale](integrations/tailscale.json) | `tailscale` | api_key | 2 |  |
| [Teleport](integrations/teleport.json) | `teleport` | api_key | 2 |  |
| [Terraform Cloud](integrations/terraform-cloud.json) | `terraform-cloud` | custom | 2 |  |
| [Veeam Backup & Replication](integrations/veeam.json) | `veeam` | custom | 3 |  |
| [ZeroTier](integrations/zerotier.json) | `zerotier` | custom | 2 |  |

### Monitoring (48)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [Amplitude](integrations/amplitude.json) | `amplitude` | api_key | 2 |  |
| [Anodot](integrations/anodot.json) | `anodot` | custom | 2 |  |
| [Auvik](integrations/auvik.json) | `auvik` | basic | 2 |  |
| [Axiom](integrations/axiom.json) | `axiom` | custom | 2 |  |
| [Better Stack](integrations/better-uptime.json) | `better-uptime` | api_key | 2 |  |
| [BetterStack](integrations/betterstack.json) | `betterstack` | api_key | 2 |  |
| [Bugsnag](integrations/bugsnag.json) | `bugsnag` | api_key | 2 |  |
| [Checkly](integrations/checkly.json) | `checkly` | api_key | 2 |  |
| [Coralogix](integrations/coralogix.json) | `coralogix` | custom | 2 |  |
| [Cronitor](integrations/cronitor.json) | `cronitor` | api_key | 2 |  |
| [CrowdStrike LogScale](integrations/logscale.json) | `logscale` | custom | 2 |  |
| [Dynatrace](integrations/dynatrace.json) | `dynatrace` | api_key | 2 |  |
| [Elastic Cloud](integrations/elastic.json) | `elastic` | custom | 2 |  |
| [FireHydrant](integrations/firehydrant.json) | `firehydrant` | api_key | 2 |  |
| [FullStory](integrations/fullstory.json) | `fullstory` | api_key | 2 |  |
| [Grafana Cloud](integrations/grafana-cloud.json) | `grafana-cloud` | custom | 4 |  |
| [Hex](integrations/hex.json) | `hex` | api_key | 2 |  |
| [Highlight](integrations/highlight-io.json) | `highlight-io` | api_key | 2 |  |
| [Honeybadger](integrations/honeybadger.json) | `honeybadger` | custom | 2 |  |
| [Honeycomb](integrations/honeycomb.json) | `honeycomb` | api_key | 2 |  |
| [Incident.io](integrations/incident-io.json) | `incident-io` | api_key | 2 |  |
| [Instatus](integrations/instatus.json) | `instatus` | custom | 2 |  |
| [LogRocket](integrations/logrocket.json) | `logrocket` | api_key | 2 |  |
| [Logz.io](integrations/logzio.json) | `logzio` | api_key | 2 |  |
| [Lumigo](integrations/lumigo.json) | `lumigo` | custom | 1 |  |
| [Mezmo](integrations/mezmo.json) | `mezmo` | custom | 2 |  |
| [Mezmo (LogDNA)](integrations/logdna.json) | `logdna` | api_key | 2 |  |
| [Mixpanel](integrations/mixpanel.json) | `mixpanel` | custom | 2 |  |
| [Monte Carlo](integrations/monte-carlo.json) | `monte-carlo` | custom | 2 |  |
| [New Relic](integrations/new-relic.json) | `new-relic` | custom | 3 |  |
| [Opsgenie](integrations/opsgenie.json) | `opsgenie` | api_key | 2 |  |
| [Papertrail](integrations/papertrail.json) | `papertrail` | custom | 2 |  |
| [Pendo](integrations/pendo.json) | `pendo` | api_key | 2 |  |
| [Plausible Analytics](integrations/plausible.json) | `plausible` | api_key | 2 |  |
| [PostHog](integrations/posthog.json) | `posthog` | api_key | 2 |  |
| [Rollbar](integrations/rollbar.json) | `rollbar` | api_key | 2 |  |
| [Rootly](integrations/rootly.json) | `rootly` | api_key | 2 |  |
| [RudderStack](integrations/rudderstack.json) | `rudderstack` | api_key | 2 |  |
| [Sentry](integrations/sentry.json) | `sentry` | custom | 2 |  |
| [SigNoz](integrations/signoz.json) | `signoz` | custom | 2 |  |
| [Splunk](integrations/splunk.json) | `splunk` | custom | 2 |  |
| [Splunk On-Call](integrations/victorops.json) | `victorops` | custom | 2 |  |
| [Statsig](integrations/statsig.json) | `statsig` | custom | 2 |  |
| [StatusCake](integrations/statuscake.json) | `statuscake` | custom | 4 |  |
| [Statuspage](integrations/statuspage.json) | `statuspage` | api_key | 2 |  |
| [Sumo Logic](integrations/sumo-logic.json) | `sumo-logic` | basic | 2 |  |
| [Sumo Logic](integrations/sumologic.json) | `sumologic` | custom | 2 |  |
| [Updown.io](integrations/updown.json) | `updown` | custom | 2 |  |

### Productivity (111)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [Absorb LMS](integrations/absorb-lms.json) | `absorb-lms` | custom | 2 | ✓ |
| [Adyen](integrations/adyen.json) | `adyen` | api_key | 2 |  |
| [Affinity](integrations/affinity.json) | `affinity` | custom | 2 |  |
| [Aha!](integrations/aha.json) | `aha` | custom | 2 |  |
| [Airtable](integrations/airtable.json) | `airtable` | api_key | 2 |  |
| [Apollo.io](integrations/apollo.json) | `apollo` | custom | 2 |  |
| [Asana](integrations/asana.json) | `asana` | api_key | 2 |  |
| [Attio](integrations/attio.json) | `attio` | api_key | 2 |  |
| [Baremetrics](integrations/baremetrics.json) | `baremetrics` | api_key | 2 |  |
| [Basecamp](integrations/basecamp.json) | `basecamp` | custom | 2 |  |
| [Beamer](integrations/beamer.json) | `beamer` | custom | 2 |  |
| [Cal.com](integrations/cal-com.json) | `cal-com` | api_key | 2 |  |
| [Calendly](integrations/calendly.json) | `calendly` | api_key | 2 |  |
| [Canny](integrations/canny.json) | `canny` | custom | 2 |  |
| [Canva](integrations/canva.json) | `canva` | api_key | 2 |  |
| [Chameleon](integrations/chameleon.json) | `chameleon` | custom | 2 |  |
| [Chargebee](integrations/chargebee.json) | `chargebee` | custom | 2 |  |
| [ChartMogul](integrations/chartmogul.json) | `chartmogul` | api_key | 2 |  |
| [Clearbit](integrations/clearbit.json) | `clearbit` | api_key | 2 |  |
| [ClickUp](integrations/clickup.json) | `clickup` | api_key | 2 |  |
| [Clockify](integrations/clockify.json) | `clockify` | api_key | 2 |  |
| [Close](integrations/close.json) | `close` | api_key | 2 |  |
| [Close CRM](integrations/close-crm.json) | `close-crm` | custom | 2 |  |
| [Coda](integrations/coda.json) | `coda` | api_key | 2 |  |
| [Confluence](integrations/confluence.json) | `confluence` | custom | 2 |  |
| [ConnectWise Manage](integrations/connectwise-manage.json) | `connectwise-manage` | custom | 2 |  |
| [Contentful](integrations/contentful.json) | `contentful` | api_key | 2 |  |
| [Contentstack](integrations/contentstack.json) | `contentstack` | custom | 2 |  |
| [Copper CRM](integrations/copper.json) | `copper` | custom | 2 |  |
| [Cornerstone OnDemand](integrations/cornerstone.json) | `cornerstone` | custom | 2 | ✓ |
| [Coupa](integrations/coupa.json) | `coupa` | custom | 2 | ✓ |
| [Docebo](integrations/docebo.json) | `docebo` | custom | 2 | ✓ |
| [DocuSign](integrations/docusign.json) | `docusign` | oauth2 | 2 |  |
| [Domo](integrations/domo.json) | `domo` | custom | 2 |  |
| [Dropbox Business](integrations/dropbox-business.json) | `dropbox-business` | oauth2 | 3 | ✓ |
| [Dropbox Sign](integrations/dropbox-sign.json) | `dropbox-sign` | custom | 1 |  |
| [Dropbox Sign](integrations/hellosign.json) | `hellosign` | api_key | 2 |  |
| [Dub.co](integrations/dub.json) | `dub` | api_key | 2 |  |
| [Dynamics 365](integrations/dynamics-365.json) | `dynamics-365` | custom | 3 |  |
| [Expensify](integrations/expensify.json) | `expensify` | custom | 1 |  |
| [Fibery](integrations/fibery.json) | `fibery` | custom | 2 |  |
| [Figma](integrations/figma.json) | `figma` | api_key | 2 |  |
| [Frame.io](integrations/frame-io.json) | `frame-io` | custom | 1 |  |
| [FreshBooks](integrations/freshbooks.json) | `freshbooks` | api_key | 2 |  |
| [Freshdesk](integrations/freshdesk.json) | `freshdesk` | custom | 2 |  |
| [Freshsales](integrations/freshsales.json) | `freshsales` | custom | 2 | ✓ |
| [Freshservice](integrations/freshservice.json) | `freshservice` | custom | 2 |  |
| [Google Workspace](integrations/google-workspace-admin.json) | `google-workspace-admin` | oauth2 | 2 |  |
| [Guru](integrations/guru.json) | `guru` | custom | 1 |  |
| [Harvest](integrations/harvest.json) | `harvest` | custom | 2 |  |
| [Hive](integrations/hive.json) | `hive` | custom | 2 | ✓ |
| [HubSpot](integrations/hubspot.json) | `hubspot` | custom | 2 |  |
| [Ironclad](integrations/ironclad.json) | `ironclad` | api_key | 2 |  |
| [IT Glue](integrations/it-glue.json) | `it-glue` | custom | 2 |  |
| [JotForm](integrations/jotform.json) | `jotform` | custom | 2 |  |
| [Juro](integrations/juro.json) | `juro` | custom | 1 |  |
| [Klaviyo](integrations/klaviyo.json) | `klaviyo` | api_key | 2 |  |
| [Lago](integrations/lago.json) | `lago` | api_key | 2 |  |
| [Litmos](integrations/litmos.json) | `litmos` | custom | 2 | ✓ |
| [Lob](integrations/lob.json) | `lob` | custom | 2 |  |
| [Lucid](integrations/lucid.json) | `lucid` | api_key | 2 |  |
| [Lucidchart](integrations/lucidchart.json) | `lucidchart` | custom | 2 |  |
| [Mailchimp](integrations/mailchimp.json) | `mailchimp` | custom | 2 |  |
| [Make](integrations/make.json) | `make` | custom | 2 |  |
| [Mercury](integrations/mercury.json) | `mercury` | api_key | 1 |  |
| [Metronome](integrations/metronome.json) | `metronome` | api_key | 2 |  |
| [Microsoft 365](integrations/microsoft-365.json) | `microsoft-365` | oauth2 | 3 |  |
| [Miro](integrations/miro.json) | `miro` | api_key | 2 |  |
| [Monday.com](integrations/monday.json) | `monday` | custom | 2 |  |
| [MURAL](integrations/mural.json) | `mural` | custom | 2 |  |
| [NetSuite](integrations/netsuite.json) | `netsuite` | custom | 2 | ✓ |
| [Notion](integrations/notion.json) | `notion` | api_key | 3 |  |
| [Outreach](integrations/outreach.json) | `outreach` | api_key | 2 |  |
| [Paddle](integrations/paddle.json) | `paddle` | api_key | 2 |  |
| [PandaDoc](integrations/pandadoc.json) | `pandadoc` | custom | 2 |  |
| [Pipedrive](integrations/pipedrive.json) | `pipedrive` | api_key | 2 |  |
| [Planhat](integrations/planhat.json) | `planhat` | api_key | 2 |  |
| [Pleo](integrations/pleo.json) | `pleo` | api_key | 2 |  |
| [Productboard](integrations/productboard.json) | `productboard` | api_key | 2 |  |
| [QuickBooks Online](integrations/quickbooks-online.json) | `quickbooks-online` | oauth2 | 1 |  |
| [Ramp](integrations/ramp.json) | `ramp` | oauth2 | 1 |  |
| [Recurly](integrations/recurly.json) | `recurly` | custom | 2 |  |
| [Retool](integrations/retool.json) | `retool` | api_key | 2 |  |
| [Sage Accounting](integrations/sage-accounting.json) | `sage-accounting` | custom | 2 |  |
| [Salesforce](integrations/salesforce.json) | `salesforce` | oauth2 | 2 |  |
| [Salesloft](integrations/salesloft.json) | `salesloft` | api_key | 2 |  |
| [Sanity](integrations/sanity.json) | `sanity` | api_key | 2 |  |
| [SAP Concur](integrations/sap-concur.json) | `sap-concur` | custom | 1 | ✓ |
| [ServiceNow](integrations/servicenow.json) | `servicenow` | custom | 2 |  |
| [Shopify](integrations/shopify.json) | `shopify` | custom | 2 |  |
| [Sigma Computing](integrations/sigma-computing.json) | `sigma-computing` | api_key | 2 |  |
| [SignNow](integrations/signnow.json) | `signnow` | custom | 1 |  |
| [Smartsheet](integrations/smartsheet.json) | `smartsheet` | api_key | 2 |  |
| [Sprig](integrations/sprig.json) | `sprig` | custom | 2 |  |
| [Square](integrations/square.json) | `square` | api_key | 2 |  |
| [Storyblok](integrations/storyblok.json) | `storyblok` | custom | 2 |  |
| [Stripe](integrations/stripe.json) | `stripe` | custom | 1 |  |
| [Teamwork](integrations/teamwork.json) | `teamwork` | api_key | 2 |  |
| [Toggl Track](integrations/toggl.json) | `toggl` | basic | 2 |  |
| [Totango](integrations/totango.json) | `totango` | custom | 2 |  |
| [Trello](integrations/trello.json) | `trello` | custom | 2 |  |
| [Typeform](integrations/typeform.json) | `typeform` | api_key | 2 |  |
| [Userflow](integrations/userflow.json) | `userflow` | custom | 2 |  |
| [Vitally](integrations/vitally.json) | `vitally` | api_key | 2 |  |
| [Workato](integrations/workato.json) | `workato` | custom | 2 |  |
| [Wrike](integrations/wrike.json) | `wrike` | api_key | 2 |  |
| [Xero](integrations/xero.json) | `xero` | oauth2 | 2 |  |
| [Zapier](integrations/zapier.json) | `zapier` | api_key | 2 |  |
| [Zendesk](integrations/zendesk.json) | `zendesk` | custom | 2 |  |
| [Zoho CRM](integrations/zoho-crm.json) | `zoho-crm` | custom | 3 | ✓ |
| [Zuora](integrations/zuora.json) | `zuora` | custom | 2 |  |

### Security (120)

| Integration | Slug | Auth | Checks | Sync |
|-------------|------|------|--------|------|
| [1Password](integrations/1password.json) | `1password` | custom | 2 |  |
| [360Learning](integrations/360learning.json) | `360learning` | custom | 2 | ✓ |
| [Abnormal Security](integrations/abnormal-security.json) | `abnormal-security` | custom | 2 |  |
| [Absolute](integrations/absolute.json) | `absolute` | custom | 2 |  |
| [Action1](integrations/action1.json) | `action1` | custom | 5 |  |
| [Addigy](integrations/addigy.json) | `addigy` | custom | 2 |  |
| [Aikido Security](integrations/aikido.json) | `aikido` | api_key | 2 |  |
| [Apiiro](integrations/apiiro.json) | `apiiro` | custom | 2 |  |
| [Apple Business Manager](integrations/apple-business-manager.json) | `apple-business-manager` | custom | 3 |  |
| [Aqua Security](integrations/aqua-security.json) | `aqua-security` | custom | 2 |  |
| [Atera](integrations/atera.json) | `atera` | custom | 3 |  |
| [Automox](integrations/automox.json) | `automox` | api_key | 2 |  |
| [Axonius](integrations/axonius.json) | `axonius` | custom | 5 | ✓ |
| [BeyondTrust](integrations/beyond-trust.json) | `beyond-trust` | custom | 3 |  |
| [BigID](integrations/bigid.json) | `bigid` | custom | 3 |  |
| [Bitdefender GravityZone](integrations/bitdefender-gravityzone.json) | `bitdefender-gravityzone` | custom | 5 |  |
| [Bitsight](integrations/bitsight.json) | `bitsight` | custom | 5 |  |
| [Bitwarden](integrations/bitwarden.json) | `bitwarden` | custom | 3 |  |
| [Carbon Black](integrations/carbon-black.json) | `carbon-black` | api_key | 2 |  |
| [Cato Networks](integrations/cato-networks.json) | `cato-networks` | custom | 2 |  |
| [Certn](integrations/certn.json) | `certn` | custom | 2 |  |
| [Chainguard](integrations/chainguard.json) | `chainguard` | custom | 2 |  |
| [Checkmarx](integrations/checkmarx.json) | `checkmarx` | custom | 2 |  |
| [Cisco Secure Endpoint](integrations/cisco-secure-endpoint.json) | `cisco-secure-endpoint` | custom | 3 |  |
| [Cisco Umbrella](integrations/cisco-umbrella.json) | `cisco-umbrella` | custom | 2 |  |
| [Cobalt](integrations/cobalt.json) | `cobalt` | api_key | 2 |  |
| [Code42 Incydr](integrations/code42-incydr.json) | `code42-incydr` | custom | 5 |  |
| [Cohesity](integrations/cohesity.json) | `cohesity` | custom | 3 |  |
| [Commvault](integrations/commvault.json) | `commvault` | custom | 3 |  |
| [Contrast Security](integrations/contrast-security.json) | `contrast-security` | custom | 2 |  |
| [Cortex XDR](integrations/cortex-xdr.json) | `cortex-xdr` | custom | 3 |  |
| [Coursera for Business](integrations/coursera-business.json) | `coursera-business` | custom | 2 | ✓ |
| [CrowdStrike Falcon](integrations/crowdstrike.json) | `crowdstrike` | custom | 2 |  |
| [CyberArk Identity](integrations/cyberark-identity.json) | `cyberark-identity` | custom | 3 | ✓ |
| [Cycode](integrations/cycode.json) | `cycode` | custom | 2 |  |
| [Darktrace](integrations/darktrace.json) | `darktrace` | custom | 3 |  |
| [Datto RMM](integrations/datto-rmm.json) | `datto-rmm` | custom | 3 |  |
| [Delinea Secret Server](integrations/delinea.json) | `delinea` | custom | 3 |  |
| [Detectify](integrations/detectify.json) | `detectify` | custom | 2 |  |
| [Endor Labs](integrations/endor-labs.json) | `endor-labs` | custom | 1 |  |
| [Envoy](integrations/envoy.json) | `envoy` | api_key | 3 | ✓ |
| [ESET Protect](integrations/eset-protect.json) | `eset-protect` | custom | 3 |  |
| [FleetDM](integrations/fleetdm.json) | `fleetdm` | custom | 3 |  |
| [Forescout](integrations/forescout.json) | `forescout` | custom | 3 |  |
| [Fortinet FortiGate](integrations/fortinet-fortigate.json) | `fortinet-fortigate` | custom | 4 |  |
| [GitGuardian](integrations/gitguardian.json) | `gitguardian` | api_key | 2 |  |
| [Go1](integrations/go1.json) | `go1` | oauth2 | 2 | ✓ |
| [Gong](integrations/gong.json) | `gong` | custom | 2 |  |
| [GoodHire](integrations/goodhire.json) | `goodhire` | api_key | 2 |  |
| [HackerOne](integrations/hackerone.json) | `hackerone` | custom | 2 |  |
| [HashiCorp Vault](integrations/hashicorp-vault.json) | `hashicorp-vault` | api_key | 2 |  |
| [Hexnode](integrations/hexnode.json) | `hexnode` | custom | 5 | ✓ |
| [Hoxhunt](integrations/hoxhunt.json) | `hoxhunt` | custom | 4 |  |
| [Huntress](integrations/huntress.json) | `huntress` | basic | 3 |  |
| [Hyperproof](integrations/hyperproof.json) | `hyperproof` | api_key | 2 |  |
| [Infisical](integrations/infisical.json) | `infisical` | api_key | 2 |  |
| [Ivanti Neurons](integrations/ivanti.json) | `ivanti` | custom | 3 |  |
| [Jamf Pro](integrations/jamf.json) | `jamf` | custom | 3 |  |
| [Kandji](integrations/kandji.json) | `kandji` | api_key | 2 |  |
| [Kaseya VSA](integrations/kaseya-vsa.json) | `kaseya-vsa` | custom | 3 |  |
| [Keeper Security](integrations/keeper-security.json) | `keeper-security` | custom | 4 |  |
| [KnowBe4](integrations/knowbe4.json) | `knowbe4` | custom | 2 |  |
| [Kolide](integrations/kolide.json) | `kolide` | custom | 2 |  |
| [Lacework](integrations/lacework.json) | `lacework` | custom | 2 |  |
| [LastPass Business](integrations/lastpass.json) | `lastpass` | custom | 3 |  |
| [Malwarebytes](integrations/malwarebytes.json) | `malwarebytes` | custom | 3 |  |
| [ManageEngine Endpoint Central](integrations/manageengine-endpoint-central.json) | `manageengine-endpoint-central` | oauth2 | 4 |  |
| [ManageEngine Log360 Cloud](integrations/manageengine-log360-cloud.json) | `manageengine-log360-cloud` | oauth2 | 3 |  |
| [Mend.io](integrations/mend-io.json) | `mend-io` | custom | 4 |  |
| [Microsoft Defender for Endpoint](integrations/microsoft-defender.json) | `microsoft-defender` | custom | 3 |  |
| [Microsoft Intune](integrations/intune.json) | `intune` | oauth2 | 3 |  |
| [Mosyle](integrations/mosyle.json) | `mosyle` | custom | 2 |  |
| [N-able N-sight RMM](integrations/n-able-n-sight.json) | `n-able-n-sight` | custom | 3 |  |
| [Nessus / Tenable Vulnerability Management](integrations/nessus.json) | `nessus` | custom | 3 |  |
| [Netskope](integrations/netskope.json) | `netskope` | custom | 4 |  |
| [Nightfall AI](integrations/nightfall-ai.json) | `nightfall-ai` | api_key | 4 |  |
| [NinjaOne (NinjaRMM)](integrations/ninjaone.json) | `ninjaone` | custom | 3 |  |
| [NordPass](integrations/nordpass.json) | `nordpass` | custom | 3 |  |
| [OneTrust](integrations/onetrust.json) | `onetrust` | custom | 3 |  |
| [Orca Security](integrations/orca-security.json) | `orca-security` | custom | 2 |  |
| [PagerDuty](integrations/pagerduty.json) | `pagerduty` | custom | 2 |  |
| [Palo Alto Networks SASE](integrations/palo-alto.json) | `palo-alto` | api_key | 2 |  |
| [Prisma Cloud](integrations/prisma-cloud.json) | `prisma-cloud` | custom | 2 |  |
| [Probely](integrations/probely.json) | `probely` | api_key | 2 |  |
| [Proofpoint](integrations/proofpoint.json) | `proofpoint` | custom | 2 |  |
| [Proofpoint TAP](integrations/proofpoint-tap.json) | `proofpoint-tap` | basic | 3 |  |
| [Qualys VMDR](integrations/qualys.json) | `qualys` | custom | 4 |  |
| [Rapid7](integrations/rapid7.json) | `rapid7` | custom | 2 |  |
| [Rubrik](integrations/rubrik.json) | `rubrik` | custom | 3 |  |
| [Scalefusion](integrations/scalefusion.json) | `scalefusion` | api_key | 2 |  |
| [Secureframe](integrations/secureframe.json) | `secureframe` | api_key | 2 |  |
| [SecurityScorecard](integrations/securityscorecard.json) | `securityscorecard` | custom | 5 |  |
| [Semgrep](integrations/semgrep.json) | `semgrep` | api_key | 2 |  |
| [SentinelOne](integrations/sentinelone.json) | `sentinelone` | api_key | 2 |  |
| [Snyk](integrations/snyk.json) | `snyk` | custom | 2 |  |
| [Socket](integrations/socket-dev.json) | `socket-dev` | api_key | 2 |  |
| [Socket Security](integrations/socket.json) | `socket` | custom | 2 |  |
| [SonarCloud](integrations/sonarcloud.json) | `sonarcloud` | custom | 2 |  |
| [SonicWall](integrations/sonicwall.json) | `sonicwall` | custom | 2 |  |
| [Sophos Central](integrations/sophos-central.json) | `sophos-central` | custom | 5 |  |
| [StackHawk](integrations/stackhawk.json) | `stackhawk` | custom | 1 |  |
| [StrongDM](integrations/strongdm.json) | `strongdm` | api_key | 2 |  |
| [Sysdig](integrations/sysdig.json) | `sysdig` | custom | 2 |  |
| [Tanium](integrations/tanium.json) | `tanium` | custom | 4 |  |
| [Tenable Cloud](integrations/tenable-cloud.json) | `tenable-cloud` | custom | 2 |  |
| [Tenable.io](integrations/tenable.json) | `tenable` | custom | 2 |  |
| [ThreatDown (Malwarebytes)](integrations/threatdown.json) | `threatdown` | custom | 5 |  |
| [Tines](integrations/tines.json) | `tines` | custom | 2 |  |
| [Torq](integrations/torq.json) | `torq` | custom | 2 |  |
| [Transcend](integrations/transcend.json) | `transcend` | api_key | 2 |  |
| [Trellix](integrations/trellix.json) | `trellix` | custom | 3 |  |
| [Trend Micro Vision One](integrations/trend-micro-vision-one.json) | `trend-micro-vision-one` | custom | 4 |  |
| [Twingate](integrations/twingate.json) | `twingate` | custom | 4 | ✓ |
| [Veracode](integrations/veracode.json) | `veracode` | custom | 2 |  |
| [VMware Workspace ONE](integrations/vmware-workspace-one.json) | `vmware-workspace-one` | custom | 3 |  |
| [VulnCheck](integrations/vulncheck.json) | `vulncheck` | custom | 2 |  |
| [WatchGuard](integrations/watchguard.json) | `watchguard` | custom | 3 |  |
| [Wiz](integrations/wiz.json) | `wiz` | custom | 2 |  |
| [Zscaler Internet Access](integrations/zscaler-zia.json) | `zscaler-zia` | custom | 4 |  |
| [Zscaler Private Access](integrations/zscaler-zpa.json) | `zscaler-zpa` | api_key | 2 |  |


## How this is maintained

This catalog is synced manually on demand from the CompAI production API using the tooling in [`tools/integrations-catalog-sync/`](../tools/integrations-catalog-sync). To request a refreshed snapshot or a new integration, open an issue.

## License

MIT — see repo root LICENSE file.
