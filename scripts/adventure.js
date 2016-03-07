var title;
var sections = [];
var currentSection;
var choices = [];

var edit;
var source;

var type = "serif";
var theme = "light";

// Initialize Adventure.

$(document).ready(function() {
    // Do not allow hashes on first load.
    if (window.location.hash) {
        window.location.hash = "";
        document.location.reload();
    }

    // Handler for Choices.
    $(document).on("click", 'a', function(event) {
        var choice = $(this).attr("choice");
        if (choice) {
            choices.push(choice);
            currentSection = choice;
            displaySection(choice);
        }
    });

    // Handlers for Type and Theme menus.
    $("#type").change(function() {
        type = $("#type option:selected").val();
        // Content must be refreshed to apply a new type.
        // Monospace requires removal of heading tags.
        // Non-monospace requires re-application of headings.
        displaySection(currentSection);
    });

    $("#theme").change(function() {
        theme = $("#theme option:selected").val();
        applyTheme(theme);
    });

    // "Back" handlers.
    window.onbeforeunload = function() {
        handleBack();
    }

    window.onhashchange = function() {
        handleBack();
    }

    // Show or hide editor.
    if (getURLParam("edit") === "true") {
        edit = true;

        $('#writer').bind('input propertychange', function() {
            parseSource($("#writer").val());
            displaySection(currentSection);
        });

    } else {
        edit = false;
        $("#editor").hide();
    }

    // Get and display story.
    getStory();
});

// Viewer functions.
function displaySection(name) {
    var htmlTree = markdown.toHTMLTree(sections[name]);
    var html = markdown.renderJsonML(htmlTree);

    // Remove H1 if not title.
    if (name !== title) {
        html = html.replace(/<h1>.+<\/h1>/, "");
    }

    $("#content").html(html);
    applyType(type);
    applyTheme(theme);
}

function applyType(type) {
    if (type === "serif") {
        $("#content").css("font-family", "Garamond, Palatino, Times, serif");
    } else if (type === "sans") {
        $("#content").css("font-family", "Arial, Helvetica, sans-serif");
    } else if (type === "mono") {
        // Strip out headings and replace with something comparable when using
        // a monospaced style.
        var content = $("#content").html();

        content = content.replace(/<h1>(.+)<\/h1>/, "<strong>$1</strong></p>");
        content = content.replace(/<h2>(.+)<\/h2>/, "<strong>$1</strong></p>");
        content = content.replace(/<h3>(.+)<\/h3>/, "<strong>$1</strong></p>");
        content = content.replace(/<h4>(.+)<\/h4>/, "<strong>$1</strong></p>");
        content = content.replace(/<h5>(.+)<\/h5>/, "<strong>$1</strong></p>");
        content = content.replace(/<h6>(.+)<\/h6>/, "<strong>$1</strong></p>");

        $("#content").html(content);

        $("#content").css("font-family", "'Courier New', Courier, 'Lucida Sans Typewriter', 'Lucida Typewriter', monospace");
    }
}

function applyTheme(theme) {
    if (theme === "light") {
        $("body").css("background-color", "#EEEEEE");
        $("#content").css("color", "#424242");
        $("#content a").css("color", "#212121");
        $("#footer").css("background-color", "#9E9E9E");
    } else if (theme === "dark") {
        $("body").css("background-color", "#212121");
        $("#content").css("color", "#BDBDBD");
        $("#content a").css("color", "#FAFAFA");
        $("#footer").css("background-color", "#9E9E9E");
    }
}

// Editor functions
function initializeEditor() {
    $("#writer").text(source);
}

// Core (Parser) functions.
function getStory() {
    // Default to "./stories/adventure.md".
    var storyPath = "./stories/";
    var story = "";

    story = getURLParam("story");

    if (!story) {
        story = "adventure";
    }

    storyPath = storyPath + story + ".md";

    // Stories have Sections, which are defined by H1s.
    // Trees have Branches, which are populated with Bundles.
    // Tree-related terminology is only used when processing text.
    $.get(storyPath, function(data) {
        parseSource(data);

        document.title = title;
        currentSection = title;
        displaySection(title);

        // Do this here. Don't grab the source twice.
        if (edit) {
            source = data;
            initializeEditor();
        }
    });
}

function parseSource(data) {
    var branches = parseStory(data);
    title = branches[0][1][2];
    sections = parseBranches(branches);
}

function parseStory(data) {
    var tree = markdown.parse(data);
    var branches = [];

    var bundle = [];
    // For markdown-js' renderer.
    bundle.push("markdown");

    var titleHeader = true;
    var createNewBundle = false;

    // tree[0] = "markdown".
    for (var i = 1; i < tree.length; i++) {
        var branch = tree[i];

        if (branch[0] === "header" && branch[1].level === 1 && !titleHeader) {
            createNewBundle = true;
        } else {
            titleHeader = false;
        }

        // Find choices implemented as links.
        parseBranchLinks(branch);

        if (createNewBundle === true) {
            branches.push(bundle);

            // Prepare new bundle
            bundle = [];
            bundle.push("markdown");
            createNewBundle = false;
        }

        bundle.push(branch);
    }

    // Last bundle.
    branches.push(bundle);

    return branches;
}

function parseBranchLinks(branch) {
    for (var i = 0; i < branch.length; i++) {
        if (branch[i].length > 0 && branch[i][0] === "link") {
            var attributes = branch[i][1];

            if (attributes["href"].substring(0, 7) === "choice:") {
                var choice = attributes["href"].substring(7);
                branch[i][1]["href"] = "#choice";
                branch[i][1]["choice"] = choice;
            } else {
                branch[i][1]["target"] = "_blank";
            }
        }
    }
}

function parseBranches(branches) {
    var sections = [];

    for (var i = 0; i < branches.length; i++) {
        var name = branches[i][1][2];
        sections[name] = branches[i];
    }

    return sections;
}

// Utility functions.
function getURLParam(param) {
    var pageURL = window.location.search.substring(1);
    var pageURLParams = pageURL.split('&');

    for (var i = 0; i < pageURLParams.length; i++) {
        var paramName = pageURLParams[i].split('=');
        if (paramName[0] == param) {
            // Do not allow paths in story parameter.
            var story = paramName[1];
            if (/[\/\.]/.test(story) === false) {
                return story;
            }
        }
    }
}

function handleBack() {
    if (choices.length > 0) {
        var hashIndex = window.location.href.indexOf('#choice');
        if (hashIndex < 0) {
            var restart = confirm("Your Adventure is still in progress. Would you like to return to the beginning?");
            if (restart) {
                document.location.reload(true);
            } else {
                window.location.hash = "choice";
                displaySection(currentSection);
            }
        }
    }
}
