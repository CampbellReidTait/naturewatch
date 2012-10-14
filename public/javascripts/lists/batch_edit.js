$.fn.setupListedTaxonRow = function() {
  $('.removelink', this).bind('ajax:beforeSend', function() {
    $(this).parents('tr:first').fadeOut()
  }).bind('ajax:complete', function() {
    $(this).parents('tr:first').remove()
  })

  $('input[type=checkbox]', this).click(function() {
    if ($(this).is(':checked')) $(this).parents('.listed_taxon_row').addClass('selected')
    else $(this).parents('.listed_taxon_row').removeClass('selected')
    $('.meta .count').html($('input[type=checkbox]:checked').length)
  })
}

$.fn.selectRows = function(checked) {
  this.prop('checked', checked).change()
  if (checked) {
    this.parents('.listed_taxon_row').addClass('selected')
  } else {
    this.parents('.listed_taxon_row').removeClass('selected')
  }
  $('.meta .count').html(checked ? this.length : 0)
}

function incrementLoadingStatus() {
  var status = $('.bigloading.status').text(),
      matches = status.match(/Saving (\d+) of (\d+)/),
      current = parseInt(matches[1]),
      total = matches[2]
  $('.bigloading.status').text("Saving " + (current + 1) + " of " + total + "...")
}

function saveListedTaxon(options) {
  var options = options || {}
  var container = $(this).parents('.listed_taxon_row:first'),
      params = container.find(':input').serialize(),
      listedTaxonId = $(container).data('listed-taxon-id'),
      listId = $(container).data('list-id')
  if (listedTaxonId && listedTaxonId != '') {
    params += '&_method=PUT'
    url = '/listed_taxa/'+listedTaxonId
  } else {
    params += '&list_id='+listId
    url = '/listed_taxa'
  }
  params += '&partial=batch_edit_row'
  $.post(url, params, function(data, status) {
    container.addClass('success')
    container.removeClass('error')
    container.find('.message').hide()
    if (!listedTaxonId || listedTaxonId == '') {
      $(data.html).addClass('success')
      var newRow = $(container).after(data.html).next()
      newRow.addClass('success').
        setupListedTaxonRow()
      if ($(container).hasClass('selected')) {
        newRow.find('input[type=checkbox]').prop('checked', true)
      }
      $(container).remove()
      newRow.effect('highlight', {color: 'lightgreen'}, 1000)
    }

    var row = newRow || container
    if (row && options.chain) {
      var link = $(row).next().has('input[type=checkbox]:checked').find('.savelink').get(0)
      if (link) {
        incrementLoadingStatus()
        saveListedTaxon.apply(link, [options])
      } else {
        $('table').shades('close')
      }
    }
  }, 'json').error(function(xhr) {
    var json = eval('(' + xhr.responseText + ')')
    container.removeClass('success')
    container.addClass('error')
    if (json.full_messages) {
      errors = json.full_messages
    } else {
      var errors = ""
      for (var key in json.errors) {
        errors += key.replace(/_/, ' ') + ' ' + json.errors[key]
      }
    }
    container.find('.message td').html(errors)
    container.effect('highlight', {color: 'lightpink'}, 1000)
    if (options.chain) {
      var link = container.next().has('input[type=checkbox]:checked').find('.savelink').get(0)
      if (link) {
        incrementLoadingStatus()
        saveListedTaxon.apply(link, [options])
      } else {
        $('table').shades('close')
      }
    }
  })

}

function applyOccurrenceStatus() {
  var val = $('th.occurrence_status select').val()
  $('tr').has('input[type=checkbox]:checked').find('.occurrence_status select').val(val)
}

function applyEstablishmentMeans() {
  var val = $('th.establishment_means select').val()
  $('tr').has('input[type=checkbox]:checked').find('.establishment_means select').val(val)
}

function saveSelected() {
  $selection = $('tr').has('input[type=checkbox]:checked')
  var msg = "Saving 1 of " + $selection.length + "..."
  $('table').shades('open', {
    css: {'background-color': 'white'}, 
    content: '<center style="margin: 100px;"><span class="loading bigloading status inlineblock">'+msg+'</span></center>'
  })

  var link = $selection.find('.savelink:first').get(0)
  saveListedTaxon.apply(link, [{chain: true}])
}

function removeSelected() {
  if (confirm('Are you sure you want to remove these taxa?')) {
    $('.new_listed_taxon_row').has('input[type=checkbox]:checked').remove()
    $('tr').has('input[type=checkbox]:checked').find('.removelink').each(function() {
      $(this).data('confirm', false)
      $(this).click()
    })
    $('.meta .count').html(0)
  }
}

$(document).ready(function() {
  $('.listed_taxon_row').setupListedTaxonRow()

  $.waypoints.settings.scrollThrottle = 30;
  // $('#wrapper').waypoint(function(event, direction) {
  //   // $('.top').toggleClass('hidden', direction === "up");
  // }, {
  //   offset: '-100%'
  // }).find
  $('thead').waypoint(function(event, direction) {
    $(this).toggleClass('sticky', direction === "down");
    event.stopPropagation();
  });

})
