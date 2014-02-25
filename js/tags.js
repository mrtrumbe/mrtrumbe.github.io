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
