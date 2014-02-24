---
layout: post
title: "Ajax Tag Solution for Jekyll on Github"
tags: code javascript jekyll
---
I really like [Jekyll](http://jekyllrb.com/) for hosting your own blog and small 
website. Combine it with the (free!) hosting solution that 
[GitHub Pages](http://pages.github.com/) provides and you have a clean blogging 
and site generation solution that will work for most situations where a dynamic server
application is not needed.

But hosting on GitHub has one big drawback: Jekyll plugins are disabled for security reasons.

One practical side effect of this is that it is difficult to properly implement tags
for your blog. This has been talked about all over the web, including on the
[Jekyll issue tracker](https://github.com/jekyll/jekyll/issues/867). It has become 
apparent that no solution is coming. So let's find a workaround!

<!-- more -->

## Existing Solutions

Various people have come up with solutions for this. My favorite is from Michael Lanyon,
who figured out how to create an 
[alphabetized page using pure Liquid templates](http://blog.lanyonm.org/articles/2013/11/21/alphabetize-jekyll-page-tags-pure-liquid.html). 
It works like a charm, but it doesn't let you create per-tag pages with post listings 
just for that particular tag.

Using a little javascript, we can extend this solution to do exactly that, with a couple
of caveats. Let's hack!


## A Static "API"

After getting Michael's solution working as an HTML page, let's create another page
that will generate the same information, rendered in JSON format. In my project, 
I put the original HTML rendering in /tags.html and the new JSON format in 
/tags_json/index.html. This file *shouldn't* have an .html extension, but that's
what Jekyll needs to process the file, so we'll work around that later. In that file,
add the following:

{% highlight HTML %}
---
---

{% capture site_tags %}{% for tag in site.tags %}{{ tag | first }}{% unless forloop.last %},{% endunless %}{% endfor %}{% endcapture %}
{% capture num_words %}
  {{ site_tags | split:',' | size }}
{% endcapture %}
{% assign tag_words = site_tags | split:',' | sort %}

{
{% for item in (0..num_words) %}{% unless forloop.last %}
  {% capture this_word %}{{ tag_words[item] | strip_newlines }}{% endcapture %}
  "{{ this_word }}": [
    {% for post in site.tags[this_word] %}{% if post.title != null %}
    ["{{ post.url }}","{{ post.title }}","{{ post.date | date_to_xmlschema }}"]{% unless forloop.last %},{% endunless %}
    {% endif %}{% endfor %}
  ]{% unless forloop.rindex == 2 %},{% endunless %}
{% endunless %}{% endfor %}
}
{% endhighlight %}

Once you've added it, build the site with Jekyll and visit the /tags_json/ page in your
browser. You should see a densly formatted JSON version of all the tags and their posts.
I've opted for a dense format that is less readable than I'd like, but I wanted to minimize
bandwidth for when the post/tag count gets high.

If the page renders correctly, you now have a faux tag API that will let you get all tags
and their posts from javascript in a browser.


## Using the API

Now let's make a simple AJAX request for the data from your website. Assuming you have 
[JQuery](http://jquery.com/) integrated into your site, you could do this in a script after
JQuery has been loaded:

{% highlight JavaScript %}
  $.ajax({
    url: '/tags_json/',
    dataType: "json",
    success: function (data) {
      console.log(data);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("failure!");
    }
  });
{% endhighlight %}

Validate the request fired off and returned your tag data by using your browser's 
developer tools. Note the "dataType: 'json'" option, which forces JQuery to interpret
the returned data as JSON. This is important, as the server sets a MIME type of 
"text/html" on the file. If you hit problems, the most likely cause of failure is 
incorrectly formatted json being rendered by Jekyll. Check the /tags_json/index.html 
file for any issues.

Once you get that working, create a more complete solution that let's you show a list
of posts for a tag when you click on a tag link in your website. First, let's create
the javascript, where all the magic will happen. Add the following to a separate
javascript file or into a script in your main page:

{% highlight JavaScript %}
var TAG_MODAL = $('\
<div id="tag-post-list-modal" class="modal fade" tabindex="-1">\
  <div class="modal-dialog">\
    <div class="modal-content">\
      <div class="modal-header">\
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\
        <h4 class="modal-title">&nbsp;</h4>\
      </div>\
      <div class="modal-body">\
        <p><a href="/tags.html">All Tags</a></p>\
        <ul class="modal-tag-list">\
        </ul>\
      </div>\
    </div>\
  </div>\
</div>\
');

var TagManager = function(){
  this.JSON_TAGS_URL = "/tags_json/";
  this._tags = null;

  $('body').append(TAG_MODAL);

  var self = this;
  $.ajax({
    url: this.JSON_TAGS_URL,
    dataType: "json",
    success: function (data) {
      self._tags = {};
      for (var p in data) {
        if (data.hasOwnProperty(p)) {
          var lp = p.toLowerCase();
          self._tags[lp] = data[p];
        }
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
    }
  });
};

TagManager.prototype = {
  getTagPosts: function(tag) {
    var lt = tag.toLowerCase();
    if (!this._tags.hasOwnProperty(lt)) {
      return null;
    }
    return this._tags[lt];
  },

  showTagPosts: function(tag) {
    var posts = this.getTagPosts(tag);
    $('.modal-title', TAG_MODAL).html('Posts with tag "' + tag + '"');
    var lst = $('.modal-body ul', TAG_MODAL);
    lst.html("");
    for (var i=0; i<posts.length; i++) {
      var url = posts[i][0];
      var title = posts[i][1];
      var displayDate = moment(posts[i][2]).format("MMMM DD, YYYY");

      var pst = '<li itemscope><span class="entry-date">' +
        displayDate + '</span> &raquo; <a href="' + url + '">' + title + '</a></li>';
      lst.append(pst)
    }
    TAG_MODAL.modal('show');
  }
};
{% endhighlight %}

That code assumes you are using (Twitter Bootstrap)[http://getbootstrap.com/]. You'll
want to change the modal template and modal showing code if you are using another UI
framework.

Once you get it integrated into your site, create an instance of the TagManager
using the following:

{% highlight JavaScript %}
    var $tags = new TagManager();
{% endhighlight %}

Applying the TagManager is similarly simple. I render my tags using Liquid template
code like this:

{% highlight HTML %}
    {% if page.tags.size > 0 %}
    <p class="tags">
      Tags:
      {% for tag in page.tags %}
        <a href="/tags.html">{{ tag }}</a>&nbsp;
      {% endfor %}
    </p>
    {% else %}
      &nbsp;
    {% endif %}
{% endhighlight %}

Not that each tag links to the main "all tags" page just in case our JavaScript fails. 
Applying the TagManager is then as simple as this:

{% highlight JavaScript %}
    $(".tags a").click(function () {
      $tags.showTagPosts($(this).html());
      return false;
    });
{% endhighlight %}

The "return false;" keeps the click from following the default link. A link to the 
"all tags" page is rendered by our JavaScript in the popup modal.


## Caveats

There is no permalink to the posts for a given tag using this solution. Ideally, the
site would have a page with a url like "/tags/mytag/" that would allow you to see
all of the posts for a tag. To access that list, the user has to find the tag on
a page on your site and click the link.

A potential workaround to this would be to use hashtags in the URL to access the list
of tags. For example, visiting "/#/tags/mytag/" might take you to the page, then 
immediately bring up a list of posts using JavaScript. If I implement such a solution
I'll post instructions on it.


## Real Life Example

I've implemented this tag method on [2HandNews.com](http://2handnews.com), a Michigan
sports blog I'm working on. See the method in action there.

And take a look at the code in the 
[GitHub Repository](https://github.com/aftco/aftco.github.io) for the site. The relevant 
files are:

* [/tags.html](https://github.com/aftco/aftco.github.io/blob/master/tags.html) The HTML
    rendering of all tags on the site.
* [/tags_json/index.html](https://github.com/aftco/aftco.github.io/blob/master/tags_json/index.html) 
    The JSON rendering of the tag data (aka, the API).
* [/js/tags.js](https://github.com/aftco/aftco.github.io/blob/master/js/tags.js) The
    file containing our JavaScript code to hit the API and render the modal.
* [/_layouts/default.html](https://github.com/aftco/aftco.github.io/blob/master/_layouts/default.html)
    Our default Jekyll layout, which defines the site skeleton and uses the TagManager.
    
If you have any questions about this, please [ask me](/#connect).

