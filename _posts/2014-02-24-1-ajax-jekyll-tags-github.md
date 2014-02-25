---
layout: post
title: "Tags for Jekyll on Github"
tags: Code JavaScript Jekyll
---

[Jekyll](http://jekyllrb.com/) is a great way to build your website with a blog. It's straightforward
but powerful and, best of all, generates a completely static site which can be hosted practically anywhere.
[GitHub Pages](http://pages.github.com/) has become a popular hosting solution for Jekyll sites. It's
free and leverages the power and availability of GitHub. Did I mention that it's free?

There is, however, one downside to hosting a Jekyll site on GitHub: no plugins. GitHub disables Jekyll
plugins for security reasons, which is understandable but unfortunate. Extending and customizing Jekyll
is much easier when you can run arbitrary Ruby code during the site build.

One practical side effect of this is that it is difficult to properly implement tags
for a Jekyll blog. This has been talked about all over the web, including on the
[Jekyll issue tracker](https://github.com/jekyll/jekyll/issues/867). It looks doubtful that
an official solution is coming, so let's find a workaround!

<!-- more -->

## Approach

Various people have come up with plugin-less tag implementations. My favorite is from Michael Lanyon,
who figured out how to create an 
[alphabetized page using pure Liquid templates](http://blog.lanyonm.org/articles/2013/11/21/alphabetize-jekyll-page-tags-pure-liquid.html). 
This works quite well, but it doesn't let you create per-tag post listings. This is a limitation of
Jekyll and the Liquid template framework, which makes per-tag pages impossible. I wanted per-tag pages,
and with a little javascript I was able extend this solution to do exactly that.

Well, *almost* exactly that. No per-tag page is actually generated. Instead, I use a pop-up modal to
display a list of posts when the user clicks on a tag name. In some ways, this is more dynamic and nicer
than a separate page for the per-tag posts. However, you can't link to a tag page using this solution.

With that caveat in mind, to the code!


## A Static "API"

First, get [Michael's solution](http://blog.lanyonm.org/articles/2013/11/21/alphabetize-jekyll-page-tags-pure-liquid.html)
working as a separate page displaying all tags. We'll still let the user access this page if they choose.

Next, let's create another page that will generate the same information, rendered in JSON format.
In my project, I put the HTML rendering in /tags.html and the new JSON rendering in
/tags_json/index.html. As this data is JSON, the file *shouldn't* have an .html extension, but that's
the extension Jekyll needs to process the file, so we'll just have to work around that later. In this file,
add the following:

{% highlight HTML %}
{% raw %}
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
{% endraw %}
{% endhighlight %}

Once you've added it, build the site with Jekyll and visit the /tags_json/ page in your
browser. You should see a densly formatted JSON version of all the tags and their posts.
I've opted for a dense format that is less readable than I'd like, but I wanted to minimize
bandwidth in case the post/tag count gets high down the line.

If the page renders correctly, you now have a faux-tag API that will let you get all tags
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

That code assumes you are using [Twitter Bootstrap](http://getbootstrap.com/). You'll
need to change the modal template and modal display code if you are using another UI
framework.

Once you get it integrated into your site, create an instance of the TagManager
using the following:

{% highlight JavaScript %}
var $tags = new TagManager();
{% endhighlight %}

Applying the TagManager is almost as simple. I render my tags using Liquid template
code like this:

{% highlight HTML %}
{% raw %}
{% if page.tags.size > 0 %}
<span class="tags">
  {% for tag in page.tags %}
    <a href="/tags.html#{{tag}}">{{ tag }}</a>&nbsp;
  {% endfor %}
</span>
{% endif %}
{% endraw %}
{% endhighlight %}

Note that each tag links to the main "all tags" page just in case our JavaScript fails. 
Applying the TagManager is just a matter of overriding the click event of the tag anchor:

{% highlight JavaScript %}
$(".tags a").click(function () {
  $tags.showTagPosts($(this).html());
  return false;
});
{% endhighlight %}

The "return false;" keeps the click from following the default link.



## Working Example

I've implemented this tag method on this blog. Click on a tag on any of the posts to see it in action.

And take a look at the code in the 
[GitHub Repository]() for the site. The relevant
files are:

* [/tags.html](https://github.com/mrtrumbe/mrtrumbe.github.io/blob/master/tags.html)
    -- The HTML rendering of all tags on the site.
* [/tags_json/index.html](https://github.com/mrtrumbe/mrtrumbe.github.io/blob/master/tags_json/index.html)
    -- The JSON rendering of the tag data (aka, the API).
* [/js/tags.js](https://github.com/mrtrumbe/mrtrumbe.github.io/blob/master/js/tags.js)
    -- The file containing our JavaScript code to hit the API and render the modal.
* [/_layouts/default.html](https://github.com/mrtrumbe/mrtrumbe.github.io/blob/master/_layouts/default.html)
    -- The default Jekyll layout, which defines the site skeleton and uses the TagManager.
* [/_layouts/post.html](https://github.com/mrtrumbe/mrtrumbe.github.io/blob/master/_layouts/post.html)
    -- The post Jekyll layout, which shows rendering of tags in a post.

If you have any questions about this, please [get in touch with me](/#connect).

