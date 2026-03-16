"""
Script to import tasks from AAI_590_5_Capstone_Project_Plan.csv into GitHub Projects.

Prerequisites:
1. Install required packages: pip install requests python-dotenv pandas
2. Create a GitHub Personal Access Token with 'repo' and 'project' scopes
3. Create a .env file with: GITHUB_TOKEN=your_token_here
4. Create a GitHub Project (Projects V2) in your repository

Usage:
python import_to_github_project.py --owner swapnilprakashpatil --repo aai590_5_capstone_project --project-number 1
"""

import os
import csv
import requests
import argparse
from typing import Dict, List, Optional
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

class GitHubProjectImporter:
    def __init__(self, owner: str, repo: str, token: str):
        self.owner = owner
        self.repo = repo
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        self.graphql_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.base_url = "https://api.github.com"
        
    def run_graphql_query(self, query: str, variables: Optional[Dict] = None) -> Dict:
        """Execute a GraphQL query against GitHub's API."""
        url = "https://api.github.com/graphql"
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
            
        response = requests.post(url, headers=self.graphql_headers, json=payload)
        response.raise_for_status()
        return response.json()
    
    def get_project_id(self, project_number: int) -> Optional[str]:
        """Get the project ID (node_id) from the project number."""
        # First try repository-level project
        query = """
        query($owner: String!, $repo: String!, $number: Int!) {
            repository(owner: $owner, name: $repo) {
                projectV2(number: $number) {
                    id
                    title
                    fields(first: 20) {
                        nodes {
                            ... on ProjectV2Field {
                                id
                                name
                            }
                            ... on ProjectV2SingleSelectField {
                                id
                                name
                                options {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
        """
        variables = {
            "owner": self.owner,
            "repo": self.repo,
            "number": project_number
        }
        
        result = self.run_graphql_query(query, variables)
        
        # If repository project not found, try user-level project
        if "errors" in result:
            print(f"Repository project not found, trying user-level project...")
            return self.get_user_project_id(project_number)
            
        project = result.get("data", {}).get("repository", {}).get("projectV2")
        if project:
            print(f"Found repository project: {project['title']}")
            self.project_fields = project.get("fields", {}).get("nodes", [])
            return project["id"]
        
        # Try user-level project as fallback
        return self.get_user_project_id(project_number)
    
    def get_user_project_id(self, project_number: int) -> Optional[str]:
        """Get the project ID for a user-level project."""
        query = """
        query($login: String!, $number: Int!) {
            user(login: $login) {
                projectV2(number: $number) {
                    id
                    title
                    fields(first: 20) {
                        nodes {
                            ... on ProjectV2Field {
                                id
                                name
                            }
                            ... on ProjectV2SingleSelectField {
                                id
                                name
                                options {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
        """
        variables = {
            "login": self.owner,
            "number": project_number
        }
        
        result = self.run_graphql_query(query, variables)
        
        if "errors" in result:
            print(f"GraphQL Error: {result['errors']}")
            return None
            
        project = result.get("data", {}).get("user", {}).get("projectV2")
        if project:
            print(f"Found user-level project: {project['title']}")
            self.project_fields = project.get("fields", {}).get("nodes", [])
            return project["id"]
        return None
    
    def get_field_id(self, field_name: str) -> Optional[str]:
        """Get the field ID for a custom field in the project."""
        for field in self.project_fields:
            if field.get("name", "").lower() == field_name.lower():
                return field["id"]
        return None
    
    def get_status_option_id(self, status_value: str) -> Optional[str]:
        """Get the option ID for a status field value."""
        for field in self.project_fields:
            if field.get("name", "").lower() == "status":
                options = field.get("options", [])
                for option in options:
                    if option.get("name", "").lower() == status_value.lower():
                        return option["id"]
        return None
    
    def create_issue(self, title: str, body: str, labels: List[str] = None) -> Optional[str]:
        """Create a GitHub issue and return its node_id."""
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/issues"
        data = {
            "title": title,
            "body": body,
            "labels": labels or []
        }
        
        response = requests.post(url, headers=self.headers, json=data)
        
        if response.status_code == 201:
            issue_data = response.json()
            print(f"✓ Created issue: {title}")
            return issue_data["node_id"]
        else:
            print(f"✗ Failed to create issue: {title}")
            print(f"  Status: {response.status_code}, Response: {response.text}")
            return None
    
    def add_item_to_project(self, project_id: str, item_id: str) -> Optional[str]:
        """Add an issue to a project and return the project item ID."""
        query = """
        mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
                item {
                    id
                }
            }
        }
        """
        variables = {
            "projectId": project_id,
            "contentId": item_id
        }
        
        result = self.run_graphql_query(query, variables)
        
        if "errors" in result:
            print(f"  ✗ Failed to add to project: {result['errors']}")
            return None
            
        item = result.get("data", {}).get("addProjectV2ItemById", {}).get("item")
        if item:
            return item["id"]
        return None
    
    def update_project_item_field(self, project_id: str, item_id: str, field_id: str, value: str):
        """Update a custom field on a project item."""
        query = """
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
            updateProjectV2ItemFieldValue(
                input: {
                    projectId: $projectId
                    itemId: $itemId
                    fieldId: $fieldId
                    value: {text: $value}
                }
            ) {
                projectV2Item {
                    id
                }
            }
        }
        """
        variables = {
            "projectId": project_id,
            "itemId": item_id,
            "fieldId": field_id,
            "value": value
        }
        
        self.run_graphql_query(query, variables)
    
    def update_status_field(self, project_id: str, item_id: str, field_id: str, option_id: str):
        """Update the status field (single select) on a project item."""
        query = """
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
            updateProjectV2ItemFieldValue(
                input: {
                    projectId: $projectId
                    itemId: $itemId
                    fieldId: $fieldId
                    value: {singleSelectOptionId: $optionId}
                }
            ) {
                projectV2Item {
                    id
                }
            }
        }
        """
        variables = {
            "projectId": project_id,
            "itemId": item_id,
            "fieldId": field_id,
            "optionId": option_id
        }
        
        self.run_graphql_query(query, variables)
    
    def import_from_csv(self, csv_file: str, project_number: int, dry_run: bool = False):
        """Import tasks from CSV file to GitHub Project."""
        # Get project ID
        project_id = self.get_project_id(project_number)
        if not project_id:
            print(f"Error: Could not find project #{project_number}")
            return
        
        print(f"\nProject ID: {project_id}")
        print(f"Reading CSV file: {csv_file}\n")
        
        # Read CSV file
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            tasks = list(reader)
        
        print(f"Found {len(tasks)} tasks to import")
        
        if dry_run:
            print("\n=== DRY RUN MODE ===")
            for i, task in enumerate(tasks[:5], 1):  # Show first 5 as sample
                print(f"\n{i}. {task['Task Name']}")
                print(f"   Module: {task['Module']}, Week: {task['Week']}")
                print(f"   Status: {task['Status']}, Priority: {task['Priority']}")
            print(f"\n... and {len(tasks) - 5} more tasks")
            print("\nRun without --dry-run to actually import")
            return
        
        # Import tasks
        success_count = 0
        failed_count = 0
        
        for i, task in enumerate(tasks, 1):
            print(f"\n[{i}/{len(tasks)}] Processing: {task['Task Name']}")
            
            # Create issue title
            title = f"[{task['Module']} {task['Week']}] {task['Task Name']}"
            
            # Create issue body
            body = f"""## {task['Task Name']}

**Module:** {task['Module']}  
**Week:** {task['Week']}  
**Category:** {task['Category']}  
**Priority:** {task['Priority']}  
**Assignee:** {task['Assignee']}  
**Estimated Hours:** {task['Estimated Hours']}  
**Start Date:** {task['Start Date']}  
**Due Date:** {task['Due Date']}  
**Dependencies:** {task['Dependencies']}  

### Description
{task['Description']}

### Deliverable
{task['Deliverable']}
"""
            
            # Determine labels
            labels = []
            if task['Priority']:
                labels.append(f"priority:{task['Priority'].lower()}")
            if task['Category']:
                labels.append(task['Category'].lower())
            if task['Module']:
                labels.append(task['Module'].lower().replace(' ', '-'))
            
            # Create issue
            issue_node_id = self.create_issue(title, body, labels)
            
            if not issue_node_id:
                failed_count += 1
                continue
            
            # Add a small delay to avoid rate limiting
            time.sleep(0.5)
            
            # Add to project
            project_item_id = self.add_item_to_project(project_id, issue_node_id)
            
            if project_item_id:
                print(f"  ✓ Added to project")
                success_count += 1
                
                # Update status if available
                if task.get('Status'):
                    status_field_id = self.get_field_id("Status")
                    if status_field_id:
                        # Map CSV status to GitHub Project status
                        status_mapping = {
                            "Not Started": "Todo",
                            "Completed": "Done",
                            "In Progress": "In Progress"
                        }
                        github_status = status_mapping.get(task['Status'], task['Status'])
                        status_option_id = self.get_status_option_id(github_status)
                        
                        if status_option_id:
                            try:
                                self.update_status_field(project_id, project_item_id, status_field_id, status_option_id)
                                print(f"  ✓ Updated status to: {github_status}")
                            except Exception as e:
                                print(f"  ! Could not update status: {e}")
            else:
                failed_count += 1
            
            # Rate limiting - be nice to GitHub API
            time.sleep(1)
        
        # Summary
        print(f"\n{'='*60}")
        print(f"Import Summary:")
        print(f"  Total tasks: {len(tasks)}")
        print(f"  Successfully imported: {success_count}")
        print(f"  Failed: {failed_count}")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="Import tasks from CSV to GitHub Projects"
    )
    parser.add_argument(
        "--owner",
        default="swapnilprakashpatil",
        help="GitHub repository owner"
    )
    parser.add_argument(
        "--repo",
        default="aai590_5_capstone_project",
        help="GitHub repository name"
    )
    parser.add_argument(
        "--project-number",
        type=int,
        required=True,
        help="GitHub Project number (find it in the project URL)"
    )
    parser.add_argument(
        "--csv-file",
        default="AAI_590_5_Capstone_Project_Plan.csv",
        help="Path to CSV file"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be imported without actually creating issues"
    )
    
    args = parser.parse_args()
    
    # Get GitHub token
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("Error: GITHUB_TOKEN not found in environment variables")
        print("Please create a .env file with: GITHUB_TOKEN=your_token_here")
        print("\nTo create a token:")
        print("1. Go to GitHub Settings > Developer settings > Personal access tokens")
        print("2. Generate new token (classic)")
        print("3. Select scopes: 'repo' and 'project'")
        return
    
    # Create importer and run
    importer = GitHubProjectImporter(args.owner, args.repo, token)
    importer.import_from_csv(args.csv_file, args.project_number, args.dry_run)


if __name__ == "__main__":
    main()
