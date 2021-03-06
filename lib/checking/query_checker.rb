class QueryChecker

  def initialize ()
    @hierarchy = []
  end

  def get checker_type
    @hierarchy.each do |checker|
      return checker if checker.class.to_s.eql? checker_type
    end
    nil
  end

  ##
  # Runs checking objects on the query and returns whether the query was correct.
  # There are three possible return values: +true+, +false+ and +nil+.
  # +true+ indicates that this method is convinced the query is correct.
  # +false+ means that the query is incorrect.
  # +nil+ means that there is no consens about the correctness.
  # The non-negative parameter +confidence+ determines how big the uncertainity intervall is.
  # Higher values result in this method returning +nil+ more often.
  def correct? (query, reference, confidence=0)
    result = check query, reference
    
    if result[:score] > confidence
      true
    elsif result[:score] < -confidence
      false
    else 
      nil
    end
  end

  ##
  # Compares both queries and returns a hash containg some information about the process.
  # Callers can rely on a minimum of a :score and a :checkers field.
  def check query, reference
    result = {:score => 0, :checkers => []}
    @hierarchy.each do |checker|
      checker_result = checker.check query, reference
      result[:checkers].append({checker.class.to_s.to_sym => checker_result})
      result[:score] += checker_result[:score]
    end
    result
  end

  def add_checker checker
    @hierarchy.append checker
  end

end
