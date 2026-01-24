J-git Privacy Policy
Last Updated: January 2026

J-git ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our browser extension.

1. Information Collection and Use
J-git is designed as a client-side tool to help users manage GitHub repositories.

Personal Access Tokens: To function, the extension requires a GitHub Personal Access Token (PAT). This token is used solely to authenticate requests with the GitHub REST API.

No Server-Side Storage: We do NOT collect, store, or transmit your GitHub tokens, repository data, or any personal information to any external servers. All data remains strictly within your local browser environment.

2. Data Storage
All configuration data, including your GitHub Token and last-used repository settings, are stored locally on your device using the chrome.storage.local API.

This data is only accessible to the extension on your local machine and is never shared with third parties.

3. Third-Party Services
J-git interacts with the following third-party services:

GitHub API: To manage files, branches, and repositories as per your commands.

jsDelivr: When you choose to use the CDN link feature, the file paths are formatted to point to jsDelivr's public CDN service for acceleration.

4. Permissions
The extension requests the following permissions for these specific reasons:

storage: To remember your Token and preferences locally so you don't have to re-enter them.

host_permissions (*https://www.google.com/search?q=.github.com): To allow the extension to communicate with the GitHub API to perform file operations.

5. Changes to This Policy
We may update our Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date.

6. Contact Us
If you have any questions about this Privacy Policy, please contact us via the GitHub Issues page of this project.