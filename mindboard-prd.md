## Problem Statement

I have a lot of projects, ideas that are difficult to mentally keep track of.

I want a way for both me and any agent I have on my machine to track and manage the progress of different projects and ideas through a Kanban-like board.

## Proposed solution

This project name is called Mind Board, and it will serve as an extension of Obsidian and visually display items to be tracked like Jira.

### User experience

I want a nextjs application that is lightweight and can spin up from the terminal. Maybe that means set up the application and then have a bash script that can be called anywhere at anytime to launch the mindboard.

I visually want the mindboard to have the same visual design patterns as Obsidian.

Functionality wise I want the user to be able to configure the root directory that mindboard should point to.

For me that will be /Users/dawsonpar/dp/notes/mindboard.

Any subdirectory inside of the root directory will be treated as projects.

The mindboard will only display one project at a time and a user can select from some drop down what project they want to display.

Individual .md files inside of the project directory will be treated as cards. Like how Jira boards have cards.

The contents of the .md files will determine the functionality.

There are four statuses a card can be:

- TODO
- IN PROGRESS
- REVIEW
- COMPLETED

So the .md file will have a ## Status section and one of the four statuses must be inside or selected.

The kanban board will have these statuses as columns.

When the user or an agent moves a card from one status to another the content of the card must reflect that.

There will be a ## Title section

The title must be capped at a 72 character limit

There will be a ## Description section

This is more flexible and not have an explicit limit

There will be a ## Tasks section

Items in this section will be `- [ ] ` elements and will be used to determine the current progress of the ticket.

Visually the card will show the title and a progress bar or wheel based on the tasks completed and remaining.

There will be a ## Comments section 

This is where users or agents can put down notes or anything additional that doesn't fit into the other sections

There should be some create button to either create a new project or card. Under the hood that just means creating a new directory or .md file.

The reason why I want this as an extension of obsidian is so I can select a card and have an option to open in Obsidian and edit it in there.

We will have to have some guardrails for unexpected user input or when a users has bad data in their card.

Like not showing unexpected sections, type checking the status of the card, etc.

I want this to be very easily portable and usable on other machines. If appropriate then use docker.

The idea is that I can download mindboard, set the root directory, spin it up and then immediately use it on my personal laptop, work laptop, or pass it along to another person on their laptop.
